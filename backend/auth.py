import os
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 720

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    token_data = {
        "user_id": user_id,
        "exp": expiration
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    token = credentials.credentials
    payload = decode_token(token)
    return payload["user_id"]
