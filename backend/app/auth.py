from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import urllib.request
import json
import os

security = HTTPBearer(auto_error=False)

def get_clerk_jwks():
    clerk_pub_key = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
    if not clerk_pub_key:
        raise HTTPException(status_code=500, detail="Clerk keys not configured on backend")
    # Fetch from Clerk frontend API
    # Clerk JWKS URL is typically derived from the domain.
    # Alternatively, you can use the CLERK_SECRET_KEY for Backend API.
    # Since this is a simple setup, we'll try to fetch JWKS from the Issuer URL.
    # We should get the issuer from the token or configure it.
    pass

# We will use Clerk's token verification.
# Since we need to verify Clerk tokens, we should use the JWKS endpoint.
# But getting the JWKS URL requires knowing the frontend API URL, which can be extracted from the publishable key.
# A simpler way with python-jose is just to decode with the PEM public key, but Clerk provides JWKS.
# Let's decode unverified first to get the `iss` (issuer).
def verify_clerk_token(token: str) -> str:
    try:
        unverified_claims = jwt.get_unverified_claims(token)
        issuer = unverified_claims.get("iss")
        if not issuer:
            raise Exception("No issuer in token")
        
        jwks_url = f"{issuer}/.well-known/jwks.json"
        
        # Fetch JWKS (in a real app, you'd cache this)
        with urllib.request.urlopen(jwks_url) as response:
            jwks = json.loads(response.read().decode())
            
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        if rsa_key:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                issuer=issuer
            )
            return payload["sub"]
        raise Exception("Invalid token structure or kid not found")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {e}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    user_id = verify_clerk_token(token)
    return user_id

def get_current_user_ws(token: str) -> str:
    if not token:
        raise ValueError("Missing token")
    return verify_clerk_token(token)
