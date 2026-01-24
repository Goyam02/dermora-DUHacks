# app/auth/dependencies.py

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt
import requests

security = HTTPBearer()

def get_current_user(credentials=Depends(security)):
    token = credentials.credentials

    try:
        unverified_claims = jwt.get_unverified_claims(token)
        issuer = unverified_claims["iss"]

        jwks_url = f"{issuer}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()

        header = jwt.get_unverified_header(token)
        kid = header["kid"]

        key = next(k for k in jwks["keys"] if k["kid"] == kid)

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )

        return payload

    except Exception as e:
        print("❌ JWT VERIFY ERROR:", repr(e))
        raise HTTPException(status_code=401, detail="Invalid token")
