import requests
from jose import jwt
from jose.exceptions import JWTError

def verify_clerk_token(token: str):
    try:
        # 1️⃣ Read unverified payload to get issuer
        unverified_payload = jwt.get_unverified_claims(token)
        issuer = unverified_payload["iss"]

        # 2️⃣ Fetch JWKS from the ISSUER (not api.clerk.com)
        jwks_url = f"{issuer}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()

        # 3️⃣ Get key id from header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header["kid"]

        # 4️⃣ Match key
        key = next(k for k in jwks["keys"] if k["kid"] == kid)

        # 5️⃣ Decode & verify
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,
            },
        )

        return payload

    except Exception as e:
        raise Exception(f"JWT verification failed: {e}")
