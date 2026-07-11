import os
import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from fastapi import Header, HTTPException

_cred_path = os.environ.get(
    "FIREBASE_SERVICE_ACCOUNT", "firebase-service-account.json"
)

if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(_cred_path))


def verify_token(authorization: str | None = Header(default=None)) -> str:
    """
    FastAPI dependency. Reads the Authorization header, verifies the Firebase
    ID token, and returns the user's UID.

    This is the ONLY place a user identity enters the system. Never trust a
    uid sent in a request body — a client can put anything there.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = authorization.split("Bearer ", 1)[1].strip()

    try:
        decoded = fb_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")