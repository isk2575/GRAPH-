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

# One row per Firebase user. uid is the Firebase UID — the only identity we trust.
users = Table(
    "users",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("email", Text),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

# The user's financial profile (goal, finances, credit). One row per user.
profiles = Table(
    "profiles",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("data", JSONB, nullable=False),
    Column("onboarded", String(8), nullable=False, server_default="false"),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)

# The generated coach plan (habits + stops). Cached so the LLM doesn't
# regenerate it on every login. `signature` tracks which profile it was
# built from — if the profile changes materially, we regenerate.
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

# Journey progress: which habits are active, which stops are done.
progress = Table(
    "progress",
    metadata,
    Column("uid", String(128), primary_key=True),
    Column("active_habits", JSONB, nullable=False, server_default="[]"),
    Column("done_stops", JSONB, nullable=False, server_default="[]"),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)


def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    metadata.create_all(engine)