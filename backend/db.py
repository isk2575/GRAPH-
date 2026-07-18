import os
from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    String,
    Text,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("email", Text),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

# `baseline` snapshots the readiness breakdown at onboarding, so the dashboard
# can show improvement over time. Written once, never overwritten.
profiles = Table(
    "profiles",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("data", JSONB, nullable=False),
    Column("onboarded", String(8), nullable=False, server_default="false"),
    Column("baseline", JSONB),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)

plans = Table(
    "plans",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("signature", Text, nullable=False),
    Column("data", JSONB, nullable=False),
    Column("missions", JSONB),
    Column("source", String(16), nullable=False, server_default="ai"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

progress = Table(
    "progress",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("active_habits", JSONB, nullable=False, server_default="[]"),
    Column("done_stops", JSONB, nullable=False, server_default="[]"),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)


def init_db() -> None:
    """Create tables if they don't exist. Never ALTERs existing tables —
    schema changes need manual SQL (see the ALTER for `baseline`)."""
    metadata.create_all(engine)