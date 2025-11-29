"""
Lumino AI - Main FastAPI Backend
Real-time voice chatbot with tone control
"""
import sys
from pathlib import Path
# Ensure repository root is on sys.path so `import backend.*` works when
# running `python main.py` from the `backend/` directory.
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import logging
import io
import os
import httpx
import jwt
import uuid
from typing import Optional, List
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlencode

from fastapi import (
    FastAPI, File, UploadFile, HTTPException,
    Form, Depends
)
from fastapi.responses import StreamingResponse, Response, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from orchestrator import Orchestrator
from config import settings
# Import init_db and get_db from database; provide a safe
# fallback if get_db is missing.
try:
    from database import init_db, get_db  # type: ignore
except Exception:
    from database import init_db
    # Fallback get_db dependency for FastAPI.
    # Use database.SessionLocal if get_db isn't available.
    try:
        from database import SessionLocal  # type: ignore
    except Exception:
        SessionLocal = None

    def get_db():
        """
        FastAPI dependency that yields a DB session.
        Fallback uses database.SessionLocal if available.
        Otherwise raises RuntimeError.
        """
        if SessionLocal is None:
            raise RuntimeError(
                "database.get_db not found; please implement get_db "
                "in database.py or provide SessionLocal in database.py"
            )
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

from auth import AuthService
from models import User
from audiobook import get_audiobook_service
from tts import get_tts_service
from image_gen import generate_image
from web_analyzer import analyze_url

# Load environment variables from .env files.
# Preference order:
# 1. repo root `.env` (allows running from workspace root)
# 2. backend `.env` (local overrides for backend-specific settings)
root_env = repo_root / ".env"
backend_env = Path(__file__).parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
# Always load backend `.env` so it can override root values when present
load_dotenv(backend_env)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database
init_db()

app = FastAPI(
    title="Lumino AI Voice API",
    description="Real-time voice chatbot with ASR → LLM → TTS pipeline",
    version="1.0.0"
)

# Serve logo and favicon from backend folder
from fastapi.responses import FileResponse

@app.get("/logo.png", include_in_schema=False)
def logo_png():
    """Return project logo image"""
    # Prefer SVG artwork if present for sharper scaling
    svg = Path(__file__).parent / "luminologo_art.svg"
    png = Path(__file__).parent / "luminologo.png"
    if svg.exists():
        return FileResponse(svg, media_type="image/svg+xml")
    if png.exists():
        return FileResponse(png, media_type="image/png")
    raise HTTPException(status_code=404, detail="Logo not found")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Return favicon for browsers and Swagger UI"""
    # Serve a favicon; prefer svg favicon if present, otherwise fall back to PNG
    svg = Path(__file__).parent / "luminologo_art.svg"
    ico = Path(__file__).parent / "luminologo.png"
    if svg.exists():
        # Some browsers accept SVG as favicon; otherwise frontend still provides PNG favicons
        return FileResponse(svg, media_type="image/svg+xml")
    if ico.exists():
        return FileResponse(ico, media_type="image/png")
    raise HTTPException(status_code=404, detail="Favicon not found")

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-User-Text", "X-Response-Text"],
)

# Initialize orchestrator
orchestrator = Orchestrator()


class RespondRequest(BaseModel):
    """Request model for /respond endpoint"""
    text: str
    tone: str = "neutral"  # calm, neutral, energetic
    user_id: Optional[str] = None
    conversation_history: Optional[list] = None


class TranscribeResponse(BaseModel):
    """Response model for /transcribe endpoint"""
    text: str
    confidence: Optional[float] = None


class RespondTextResponse(BaseModel):
    """Response model for /respond (text-only mode)"""
    response_text: str
    tone: str


class WebsiteAnalyzeRequest(BaseModel):
    url: str
    context: Optional[str] = None


class WebsiteAnalyzeResponse(BaseModel):
    analysis_text: str
    findings: dict


class ImageGenerateRequest(BaseModel):
    """Request model for /generate-image endpoint"""
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 512
    height: int = 512
    steps: int = 20


# Authentication Models
class RegisterRequest(BaseModel):
    """Request model for user registration"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    """Request model for user login"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response model for authentication"""
    access_token: str
    token_type: str
    user: dict


class UserProfileUpdate(BaseModel):
    """Request model for updating user profile"""
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_tone: Optional[str] = None
    preferred_voice: Optional[str] = None
    language: Optional[str] = None
    personality_traits: Optional[dict] = None
    interests: Optional[List[str]] = None
    conversation_style: Optional[str] = None


class UserProfileResponse(BaseModel):
    """Response model for user profile"""
    id: str
    email: str
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    preferred_tone: str
    preferred_voice: Optional[str]
    language: str
    personality_traits: Optional[dict]
    interests: Optional[List[str]]
    conversation_style: str
    created_at: datetime
    last_login: Optional[datetime]


# Security
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token
    """
    token = credentials.credentials
    payload = AuthService.verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )
    
    user = AuthService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )
    
    return user


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Lumino AI Voice API",
        "version": "1.0.0",
        "database": "connected"
    }


@app.get("/_debug/routes")
async def list_routes():
    """Debug endpoint: return registered route paths."""
    paths = []
    for r in app.routes:
        p = getattr(r, "path", None)
        if p:
            paths.append(p)
    # De-duplicate and sort for readability
    unique = sorted(list(dict.fromkeys(paths)))
    return {"routes": unique}


# ==================== Authentication Endpoints ====================

@app.post("/auth/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account
    
    Args:
        request: Registration data (email, username, password)
        
    Returns:
        JWT access token and user information
    """
    try:
        # Register user
        user = AuthService.register_user(
            db=db,
            email=request.email,
            username=request.username,
            password=request.password,
            full_name=request.full_name
        )
        
        # Create access token
        access_token = AuthService.create_access_token(
            data={"user_id": user.id, "email": user.email}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name
            }
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")


@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password
    
    Args:
        request: Login credentials (email, password)
        
    Returns:
        JWT access token and user information
    """
    try:
        # Authenticate user
        user = AuthService.authenticate_user(
            db=db,
            email=request.email,
            password=request.password
        )
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token = AuthService.create_access_token(
            data={"user_id": user.id, "email": user.email}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "preferred_tone": user.preferred_tone,
                "preferred_voice": user.preferred_voice
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")


@app.post("/auth/forgot-password")
async def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Request password reset
    
    Args:
        email: User's email address
        
    Returns:
        Success message (always returns success for security)
    """
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Generate reset token (valid for 1 hour)
            reset_token = AuthService.create_access_token(
                data={
                    "user_id": user.id,
                    "email": user.email,
                    "type": "password_reset",
                },
                expires_delta=timedelta(hours=1),
            )
            
            # In production, send email with reset link
            # For now, log the token (in production, remove this!)
            logger.info(f"Password reset token for {email}: {reset_token}")
            reset_url = (
                "http://localhost:5173/reset-password?token="
                f"{reset_token}"
            )
            logger.info(f"Reset URL: {reset_url}")
            
            # TODO: Send email using a service like SendGrid, AWS SES, etc.
            # await send_reset_email(email, reset_token)
        
        # Always return success for security (don't reveal if email exists)
        return {
            "success": True,
            "message": (
                "If your email is registered, you will receive a "
                "password reset link shortly."
            ),
        }
    
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        # Still return success for security
        return {
            "success": True,
            "message": "If your email is registered, you will receive a password reset link shortly."
        }


@app.post("/auth/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """
    Reset password with token
    
    Args:
        token: Reset token from email
        new_password: New password
        
    Returns:
        Success message
    """
    try:
        # Verify token
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            user_id = payload.get("user_id")
            token_type = payload.get("type")

            if token_type != "password_reset":
                raise HTTPException(
                    status_code=400,
                    detail="Invalid token type",
                )

            if not user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid token",
                )

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=400,
                detail="Reset token has expired",
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=400,
                detail="Invalid reset token",
            )
        
        # Find user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update password
        hashed_password = AuthService.hash_password(new_password)
        user.password_hash = hashed_password
        db.commit()
        
        logger.info(f"Password reset successful for user: {user.email}")
        
        return {
            "success": True,
            "message": (
                "Password reset successful. You can now login with "
                "your new password."
            ),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Password reset failed")


@app.get("/auth/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user's profile
    
    Returns:
        User profile information
    """
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        preferred_tone=current_user.preferred_tone,
        preferred_voice=current_user.preferred_voice,
        language=current_user.language,
        personality_traits=current_user.personality_traits,
        interests=current_user.interests,
        conversation_style=current_user.conversation_style,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


@app.put("/auth/profile", response_model=UserProfileResponse)
async def update_profile(
    request: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile and personalization settings
    
    Args:
        request: Profile update data
        
    Returns:
        Updated user profile
    """
    try:
        # Update profile
        updated_user = AuthService.update_user_profile(
            db=db,
            user_id=current_user.id,
            full_name=request.full_name,
            bio=request.bio,
            avatar_url=request.avatar_url,
            preferred_tone=request.preferred_tone,
            preferred_voice=request.preferred_voice,
            language=request.language,
            personality_traits=request.personality_traits,
            interests=request.interests,
            conversation_style=request.conversation_style
        )
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserProfileResponse(
            id=updated_user.id,
            email=updated_user.email,
            username=updated_user.username,
            full_name=updated_user.full_name,
            avatar_url=updated_user.avatar_url,
            bio=updated_user.bio,
            preferred_tone=updated_user.preferred_tone,
            preferred_voice=updated_user.preferred_voice,
            language=updated_user.language,
            personality_traits=updated_user.personality_traits,
            interests=updated_user.interests,
            conversation_style=updated_user.conversation_style,
            created_at=updated_user.created_at,
            last_login=updated_user.last_login
        )
     
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Profile update failed")


# ===== OAuth Routes =====

@app.get("/auth/google")
async def google_login():
    """
    Redirect to Google OAuth login
    """
    # Get credentials from environment
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    if not client_id:
        return {
            "status": "setup_required",
            "message": "Google OAuth Setup Instructions",
            "steps": [
                "1. Go to https://console.cloud.google.com/",
                "2. Create a new project or select existing",
                "3. Enable Google+ API",
                "4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID",
                "5. Add authorized redirect URI: http://localhost:8000/auth/google/callback",
                "6. Copy Client ID and Client Secret",
                "7. Add to backend/.env file:",
                "   GOOGLE_CLIENT_ID=your_client_id",
                "   GOOGLE_CLIENT_SECRET=your_client_secret"
            ],
            "quick_demo": {
                "message": "For a quick demo without OAuth setup, use the email/password signup",
                "demo_account": {
                    "email": "demo@lumino.ai",
                    "password": "demo123"
                }
            },
            "alternative": "You can continue with regular email/password authentication"
        }
    
    # Build Google OAuth URL
    redirect_uri = "http://localhost:8000/auth/google/callback"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    # Redirect to Google
    return RedirectResponse(url=auth_url)


@app.get("/auth/google/callback")
async def google_callback(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback
    
    Args:
        code: Authorization code from Google
        state: State parameter for CSRF protection
        
    Returns:
        Redirect to frontend with token
    """
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = "http://localhost:8000/auth/google/callback"
        
        if not client_id or not client_secret:
            raise HTTPException(
                status_code=500,
                detail="OAuth credentials not configured"
            )
        
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to exchange authorization code"
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # Get user info from Google
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_info_response.status_code != 200:
                logger.error(f"User info fetch failed: {user_info_response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to get user information"
                )
            
            user_info = user_info_response.json()
            
            # Create or get user
            email = user_info.get("email")
            username = email.split("@")[0] if email else "user"
            full_name = user_info.get("name")
            avatar_url = user_info.get("picture")
            
            user = AuthService.get_or_create_oauth_user(
                db=db,
                email=email,
                username=username,
                full_name=full_name,
                avatar_url=avatar_url,
                oauth_provider="google"
            )
            
            # Create JWT token
            jwt_token = AuthService.create_access_token(
                data={"user_id": user.id, "email": user.email}
            )
            
            # Redirect to frontend with token
            frontend_url = f"http://localhost:5173/auth/callback?token={jwt_token}"
            return RedirectResponse(url=frontend_url)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth error: {str(e)}")
        # Redirect to frontend with error
        error_url = f"http://localhost:5173/login?error=oauth_failed"
        return RedirectResponse(url=error_url)


@app.get("/auth/github")
async def github_login():
    """
    Redirect to GitHub OAuth login
    """
    github_client_id = settings.GITHUB_CLIENT_ID
    
    # Check if GitHub OAuth is configured
    if not github_client_id:
        return {
            "status": "setup_required",
            "message": "GitHub OAuth Setup Instructions",
            "steps": [
                "1. Go to https://github.com/settings/developers",
                "2. Click 'New OAuth App'",
                "3. Fill in details:",
                "   - Application name: Lumino AI",
                "   - Homepage URL: http://localhost:5173",
                "   - Authorization callback URL: http://localhost:8000/auth/github/callback",
                "4. Copy Client ID and Client Secret",
                "5. Add to backend/.env file:",
                "   GITHUB_CLIENT_ID=your_client_id",
                "   GITHUB_CLIENT_SECRET=your_client_secret"
            ],
            "quick_demo": {
                "message": "For a quick demo, use email/password signup",
                "demo_account": {
                    "email": "demo@lumino.ai",
                    "password": "demo123"
                }
            },
            "alternative": "Continue with regular email/password authentication"
        }
    
    # Build GitHub OAuth URL
    redirect_uri = "http://localhost:8000/auth/github/callback"
    scope = "read:user user:email"
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={github_client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}"
    )
    
    return RedirectResponse(url=github_auth_url)


@app.get("/auth/github/callback")
async def github_callback(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle GitHub OAuth callback"""
    try:
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth failed"))
            
            access_token = token_data.get("access_token")
            
            # Get user info from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            user_data = user_response.json()
            
            # Get user email (GitHub requires separate request)
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            emails = email_response.json()
            
            # Find primary verified email
            primary_email = next(
                (email["email"] for email in emails if email.get("primary") and email.get("verified")),
                None
            )
            
            if not primary_email:
                raise HTTPException(status_code=400, detail="No verified email found on GitHub account")
        
        # Generate username from email or GitHub login
        username = primary_email.split("@")[0] if primary_email else user_data.get("login")
        
        # Create or get user
        user = AuthService.get_or_create_oauth_user(
            db=db,
            email=primary_email,
            username=username,
            full_name=user_data.get("name") or user_data.get("login"),
            avatar_url=user_data.get("avatar_url"),
            oauth_provider="github"
        )
        
        # Create JWT token
        jwt_token = AuthService.create_access_token(
            data={"user_id": user.id, "email": user.email}
        )
        
        # Redirect to frontend with token
        frontend_url = f"http://localhost:5173/auth/callback?token={jwt_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        error_url = "http://localhost:5173/login?error=github_oauth_failed"
        return RedirectResponse(url=error_url)


@app.get("/auth/microsoft")
async def microsoft_login():
    """
    Redirect to Microsoft OAuth login
    
    Note: Microsoft OAuth has restrictions for personal accounts.
    This requires Azure AD setup or Microsoft 365 Developer Program.
    """
    microsoft_client_id = settings.MICROSOFT_CLIENT_ID
    
    # Check if Microsoft OAuth is configured
    if not microsoft_client_id:
        return {
            "status": "setup_required",
            "message": "Microsoft OAuth Setup - Important Notice",
            "notice": "Microsoft has restricted personal account OAuth for new apps. You need either:",
            "options": [
                "Option 1: Use organizational/work account (Azure AD)",
                "Option 2: Join Microsoft 365 Developer Program (FREE)",
                "Option 3: Use Google or GitHub OAuth instead (recommended)"
            ],
            "steps": [
                "=== For Microsoft 365 Developer Program (FREE) ===",
                "1. Go to https://developer.microsoft.com/microsoft-365/dev-program",
                "2. Join the program (FREE, instant access)",
                "3. Get your Microsoft 365 developer tenant",
                "4. Go to https://portal.azure.com/",
                "5. Sign in with your developer account",
                "6. Navigate to Azure Active Directory > App registrations",
                "7. Click 'New registration'",
                "8. Fill in:",
                "   - Name: Lumino AI",
                "   - Supported types: Single tenant (This directory only)",
                "   - Redirect URI: Web - http://localhost:8000/auth/microsoft/callback",
                "9. Copy Application (client) ID and Directory (tenant) ID",
                "10. Go to Certificates & secrets > New client secret",
                "11. Copy the secret value",
                "12. Add to backend/.env:",
                "    MICROSOFT_CLIENT_ID=your_client_id",
                "    MICROSOFT_CLIENT_SECRET=your_client_secret",
                "    MICROSOFT_TENANT_ID=your_tenant_id"
            ],
            "recommendation": {
                "message": "✨ Easier alternatives available!",
                "options": [
                    "🟢 Google OAuth - Already working!",
                    "🟣 GitHub OAuth - Already working!",
                    "Both are instant setup and support personal accounts"
                ]
            },
            "quick_demo": {
                "message": "For a quick demo, use email/password signup",
                "demo_account": {
                    "email": "demo@lumino.ai",
                    "password": "demo123"
                }
            }
        }
    
    # Build Microsoft OAuth URL
    tenant_id = settings.MICROSOFT_TENANT_ID
    redirect_uri = "http://localhost:8000/auth/microsoft/callback"
    scope = "openid email profile User.Read"
    
    microsoft_auth_url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?"
        f"client_id={microsoft_client_id}&"
        f"response_type=code&"
        f"redirect_uri={redirect_uri}&"
        f"response_mode=query&"
        f"scope={scope}"
    )
    
    return RedirectResponse(url=microsoft_auth_url)


@app.get("/auth/microsoft/callback")
async def microsoft_callback(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle Microsoft OAuth callback"""
    try:
        tenant_id = settings.MICROSOFT_TENANT_ID
        redirect_uri = "http://localhost:8000/auth/microsoft/callback"
        
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            token_data = token_response.json()
            
            if "error" in token_data:
                raise HTTPException(
                    status_code=400,
                    detail=token_data.get("error_description", "OAuth failed")
                )
            
            access_token = token_data.get("access_token")
            
            # Get user info from Microsoft Graph API
            user_response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            user_data = user_response.json()
            
            # Get user photo
            photo_url = None
            try:
                photo_response = await client.get(
                    "https://graph.microsoft.com/v1.0/me/photo/$value",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if photo_response.status_code == 200:
                    # In production, you'd upload this to storage
                    # For now, we'll use a default or skip it
                    photo_url = None
            except:
                pass
            
            email = user_data.get("mail") or user_data.get("userPrincipalName")
            if not email:
                raise HTTPException(status_code=400, detail="No email found")
            
            username = email.split("@")[0]
            full_name = user_data.get("displayName")
        
        # Create or get user
        user = AuthService.get_or_create_oauth_user(
            db=db,
            email=email,
            username=username,
            full_name=full_name,
            avatar_url=photo_url,
            oauth_provider="microsoft"
        )
        
        # Create JWT token
        jwt_token = AuthService.create_access_token(
            data={"user_id": user.id, "email": user.email}
        )
        
        # Redirect to frontend with token
        frontend_url = f"http://localhost:5173/auth/callback?token={jwt_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        print(f"Microsoft OAuth error: {e}")
        error_url = "http://localhost:5173/login?error=microsoft_oauth_failed"
        return RedirectResponse(url=error_url)


@app.get("/db-test")
async def test_database():
    """Test database connection and operations"""
    try:
        from db_service import get_db_service
        
        db_service = get_db_service()
        
        # Test user creation
        user = db_service.get_or_create_user("test_user_123")
        
        # Test conversation creation
        conv = db_service.create_conversation(
            user_id="test_user_123",
            conversation_id=f"test_conv_{datetime.now().timestamp()}",
            title="Test Conversation"
        )
        
        return {
            "status": "success",
            "message": "Database is working!",
            "test_user_id": user.id,
            "test_conversation_id": conv.id
        }
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "asr": "ready",
        "llm": "ready",
        "tts": "ready",
        "model": settings.LLM_MODEL
    }


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form("en")
):
    """
    Transcribe audio to text using ASR
    
    Args:
        audio: Audio file (wav, mp3, webm, etc.)
        language: Language code (default: en)
    
    Returns:
        JSON with transcribed text and confidence score
    """
    try:
        # Read audio bytes
        audio_bytes = await audio.read()
        logger.info(f"Received audio file: {audio.filename}, size: {len(audio_bytes)} bytes")
        # Transcribe using orchestrator
        result = await orchestrator.transcribe_audio(audio_bytes, language)
        return TranscribeResponse(
            text=result["text"],
            confidence=result.get("confidence")
        )
    except Exception as e:
        logger.exception(f"Transcription error: {str(e)}")
        # Provide user-friendly error for ASR connection/config issues
        if "ASR configuration error" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"Transcription failed: {str(e)}"
            )
        if "ASR connection error" in str(e):
            raise HTTPException(
                status_code=502,
                detail=f"Transcription failed: {str(e)}"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@app.post("/respond")
async def respond(request: RespondRequest):
    """
    Generate LLM response and convert to speech with tone control
    
    Args:
        request: JSON with text, tone (calm/neutral/energetic), optional user_id
    
    Returns:
        Audio stream (mp3) with TTS response
    """
    try:
        logger.info(f"Respond request: text='{request.text[:50]}...', tone={request.tone}")
        
        # Validate tone
        if request.tone not in ["calm", "neutral", "energetic"]:
            raise HTTPException(status_code=400, detail="Tone must be calm, neutral, or energetic")
        
        # Generate response using orchestrator
        audio_stream = await orchestrator.generate_response(
            text=request.text,
            tone=request.tone,
            user_id=request.user_id
        )
        
        # Return audio stream
        return StreamingResponse(
            io.BytesIO(audio_stream),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=response.mp3"
            }
        )
    
    except Exception as e:
        logger.exception(f"Response generation error: {str(e)}")
        # If the LLM provider is unavailable, return a 503; if request too large, return 413
        try:
            from backend.llm import LLMServiceUnavailable, LLMRequestTooLarge
        except Exception:
            try:
                from .llm import LLMServiceUnavailable, LLMRequestTooLarge
            except Exception:
                LLMServiceUnavailable = None
                LLMRequestTooLarge = None

        if LLMRequestTooLarge and isinstance(e, LLMRequestTooLarge):
            # Payload too large for provider limits
            raise HTTPException(status_code=413, detail=str(e))
        if LLMServiceUnavailable and isinstance(e, LLMServiceUnavailable):
            # Service is temporarily unavailable
            raise HTTPException(status_code=503, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=f"Response generation failed: {str(e)}")


@app.post("/respond-text", response_model=RespondTextResponse)
async def respond_text(request: RespondRequest):
    """
    Generate LLM response (text only, no TTS) - useful for debugging
    
    Args:
        request: JSON with text, tone, optional user_id
    
    Returns:
        JSON with response text
    """
    try:
        logger.info(f"Respond-text request: text='{request.text[:50]}...', tone={request.tone}")
        
        # Generate text response only
        response_text = await orchestrator.generate_text_response(
            text=request.text,
            tone=request.tone,
            user_id=request.user_id,
            conversation_history=request.conversation_history
        )
        
        return RespondTextResponse(
            response_text=response_text,
            tone=request.tone
        )
    
    except Exception as e:
        logger.error(f"Text response error: {str(e)}")
        try:
            from backend.llm import LLMServiceUnavailable, LLMRequestTooLarge
        except Exception:
            try:
                from .llm import LLMServiceUnavailable, LLMRequestTooLarge
            except Exception:
                LLMServiceUnavailable = None
                LLMRequestTooLarge = None

        if LLMRequestTooLarge and isinstance(e, LLMRequestTooLarge):
            raise HTTPException(status_code=413, detail=str(e))
        if LLMServiceUnavailable and isinstance(e, LLMServiceUnavailable):
            raise HTTPException(status_code=503, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=f"Text response failed: {str(e)}")


@app.post("/analyze-website", response_model=WebsiteAnalyzeResponse)
async def analyze_website(request: WebsiteAnalyzeRequest):
    """Fetch a website, extract structure and ask the LLM to assess content and legitimacy."""
    try:
        logger.info(f"Website analysis request for: {request.url}")
        # Fetch and extract structural findings
        res = await analyze_url(request.url)
        if res.get("error"):
            raise HTTPException(status_code=400, detail=res["error"])

        findings = res.get("findings", {})

        # Build prompt for LLM: include findings summary and ask for assessment
        prompt = (
            "You are an expert web analyst. Given the following site findings, "
            "describe the website's purpose, content layout, and give a short legitimacy assessment. "
            "List clear indicators that support your conclusion and give a confidence score 0-100.\n\n"
        )
        prompt += f"Findings:\nTitle: {findings.get('title')}\n"
        prompt += f"Meta description: {findings.get('meta_description')}\n"
        prompt += f"H1 samples: {findings.get('h1')}\n"
        prompt += f"Flags: {findings.get('flags')}\n"
        prompt += f"Sample links: {findings.get('sample_links')[:10]}\n"
        prompt += "\nPlease provide:\n- Short summary of purpose\n- Layout and main content types\n- Legitimacy assessment (legit/suspicious/malicious) and reasons\n- Actionable advice for the user\n"

        # Use orchestrator's text generator to produce the analysis
        analysis_text = await orchestrator.generate_text_response(
            text=prompt,
            tone="neutral",
            user_id=None,
            conversation_history=None
        )

        return WebsiteAnalyzeResponse(
            analysis_text=analysis_text,
            findings=findings
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Website analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/generate-image')
async def generate_image_endpoint(req: ImageGenerateRequest):
    """Generate an image for the given prompt using a hosted provider.

    Returns raw PNG bytes as a streaming response.
    """
    try:
        # Extract values from request model
        prompt = (req.prompt or "").strip()
        negative_prompt = req.negative_prompt
        width = req.width
        height = req.height
        steps = req.steps

        # Basic validation
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        logger.info("Image generation requested: prompt=%s (len=%d)", prompt[:80], len(prompt))

        img_bytes = await generate_image(
            prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
        )

        return Response(content=img_bytes, media_type='image/png')

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Image generation failed: {e}")
        raise HTTPException(status_code=503, detail=f"Image generation failed: {e}")


# -------------------- Image gallery (server-side) --------------------
@app.post('/upload-image')
async def upload_image(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Upload an image and persist it under backend/uploads/images/<user_id>

    Accepts a multipart file upload. If `user_id` is not provided, the
    authenticated user's id will be used. Returns the public URL for the saved image.
    """
    try:
        # Determine owner id
        owner_id = user_id or (current_user.id if current_user else "public")

        uploads_root = Path(__file__).parent / "uploads" / "images" / owner_id
        uploads_root.mkdir(parents=True, exist_ok=True)

        # Create a safe, unique filename
        original_name = Path(file.filename).name
        ext = original_name.split('.')[-1] if '.' in original_name else 'png'
        filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"

        dest = uploads_root / filename
        # Stream write to avoid loading large files into memory
        with open(dest, 'wb') as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

        url = f"/images/{owner_id}/{filename}"
        return {"success": True, "url": url, "filename": filename, "owner_id": owner_id}

    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/images/{user_id}')
async def list_user_images(user_id: str):
    """List images for a given user id"""
    try:
        uploads_root = Path(__file__).parent / "uploads" / "images" / user_id
        if not uploads_root.exists():
            return {"user_id": user_id, "images": []}

        items = []
        for p in sorted(uploads_root.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if p.is_file():
                items.append({
                    "filename": p.name,
                    "url": f"/images/{user_id}/{p.name}",
                    "size": p.stat().st_size,
                    "modified": datetime.fromtimestamp(p.stat().st_mtime).isoformat()
                })

        return {"user_id": user_id, "images": items}

    except Exception as e:
        logger.error(f"Error listing images for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/images/{user_id}/{filename}')
async def serve_user_image(user_id: str, filename: str):
    """Serve an uploaded image file"""
    try:
        p = Path(__file__).parent / "uploads" / "images" / user_id / filename
        if not p.exists() or not p.is_file():
            raise HTTPException(status_code=404, detail="Image not found")
        return FileResponse(p, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving image {user_id}/{filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/images/{user_id}/{filename}')
async def delete_user_image(user_id: str, filename: str, current_user: User = Depends(get_current_user)):
    """Delete an uploaded image. Requires authentication and ownership."""
    try:
        # Only allow owner to delete
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this image")

        p = Path(__file__).parent / "uploads" / "images" / user_id / filename
        if not p.exists() or not p.is_file():
            raise HTTPException(status_code=404, detail="Image not found")

        p.unlink()
        return {"success": True, "deleted": filename}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting image {user_id}/{filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/voice-roundtrip")
async def voice_roundtrip(
    audio: UploadFile = File(...),
    tone: str = Form("neutral"),
    language: str = Form("en"),
    user_id: Optional[str] = Form(None),
    voice: Optional[str] = Form(None)
):
    """
    Complete voice roundtrip: ASR → LLM → TTS
    
    Args:
        audio: Audio file from user
        tone: Desired response tone (calm/neutral/energetic)
        language: Input language code
        user_id: Optional user identifier for personalization
    
    Returns:
        Audio stream (mp3) with AI response + text metadata in headers
    """
    try:
        # Read audio
        audio_bytes = await audio.read()
        logger.info(f"Voice roundtrip: audio size={len(audio_bytes)}, tone={tone}, lang={language}")
        
        # Validate tone
        if tone not in ["calm", "neutral", "energetic"]:
            raise HTTPException(status_code=400, detail="Tone must be calm, neutral, or energetic")
        
        # Process full pipeline and get text transcripts
        result = await orchestrator.voice_roundtrip_with_text(
            audio_bytes=audio_bytes,
            tone=tone,
            language=language,
            user_id=user_id
            , voice=voice
        )
        
        return StreamingResponse(
            io.BytesIO(result["audio"]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=response.mp3",
                "X-User-Text": result["user_text"],
                "X-Response-Text": result["response_text"]
            }
        )
    
    except Exception as e:
        logger.error(f"Voice roundtrip error: {str(e)}")
        try:
            from backend.llm import LLMServiceUnavailable, LLMRequestTooLarge
        except Exception:
            try:
                from .llm import LLMServiceUnavailable, LLMRequestTooLarge
            except Exception:
                LLMServiceUnavailable = None
                LLMRequestTooLarge = None

        if LLMRequestTooLarge and isinstance(e, LLMRequestTooLarge):
            raise HTTPException(status_code=413, detail=str(e))
        if LLMServiceUnavailable and isinstance(e, LLMServiceUnavailable):
            raise HTTPException(status_code=503, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=f"Voice roundtrip failed: {str(e)}")


@app.post("/speak")
async def speak_text(
    text: str = Form(...),
    voice: str = Form("lisa")
):
    """
    Convert text to speech using free natural voices
    
    Args:
        text: Text to convert to speech
        voice: Voice name (lisa, jenny, aria, emma, mary, john, david, guy, tony)
    
    Returns:
        Audio stream (MP3)
    """
    try:
        from elevenlabs_tts import get_free_tts_service
        
        tts_service = get_free_tts_service()
        logger.info(f"GET /voices called: providing {len(tts_service.get_voice_options())} free voices")
        audio_bytes = await tts_service.synthesize(text, voice)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@app.get("/voices")
async def get_voices():
    """Get list of available natural voices"""
    try:
        from elevenlabs_tts import get_free_tts_service
        
        tts_service = get_free_tts_service()
        # Free voices are provided as name->metadata dict (with provider, voice_id)
        voices = tts_service.get_voice_options()
        # Add OpenAI TTS voices (static list)
        openai_voices = {
            "alloy": {
                "provider": "openai",
                "description": "Alloy - Natural, expressive",
            },
            "echo": {
                "provider": "openai",
                "description": "Echo - Bright, clear",
            },
            "fable": {
                "provider": "openai",
                "description": "Fable - Storyteller",
            },
            "onyx": {
                "provider": "openai",
                "description": "Onyx - Deep, announcer",
            },
            "nova": {
                "provider": "openai",
                "description": "Nova - Smooth, natural",
            },
            "shimmer": {
                "provider": "openai",
                "description": "Shimmer - Warm, friendly",
            },
        }
        # Merge so openai voices are present alongside free voices
        # Merge openai voices with free voices by name; add provider metadata
        for k, v in openai_voices.items():
            if k not in voices:
                voices[k] = {
                    "name": k,
                    "provider": v.get("provider", "openai"),
                    "gender": v.get("gender", "unknown"),
                    "description": v.get("description", ""),
                    "available": True,
                }

        return {"voices": voices}
    
    except Exception as e:
        logger.error(f"Error getting voices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice-clone/create")
async def create_voice_clone(
    audio: UploadFile = File(...),
    user_id: str = Form(...),
    profile_name: str = Form("default")
):
    """
    Create a voice clone from user's audio sample
    Fast endpoint - just saves the audio file
    """
    try:
        logger.info(f"🎙️ Voice clone request - User: {user_id}")
        
        from voice_clone import get_voice_clone_service
        
        # Read audio bytes
        audio_bytes = await audio.read()
        logger.info(f"📥 Received: {len(audio_bytes)} bytes")
        
        # Create profile (fast - just saves file)
        service = get_voice_clone_service()
        result = await service.create_voice_profile(
            audio_bytes, user_id, profile_name
        )
        
        if result.get('success'):
            logger.info("✅ Profile created successfully")
        else:
            logger.error(f"❌ Failed: {result.get('error')}")
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Exception: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/voice-clone/speak")
async def speak_with_cloned_voice(
    text: str = Form(...),
    user_id: str = Form(...),
    profile_name: str = Form("default"),
    speed: float = Form(1.0)
):
    """
    Generate speech using user's cloned voice
    
    Args:
        text: Text to speak
        user_id: User identifier
        profile_name: Voice profile to use
        speed: Speech speed (0.5 to 2.0)
    
    Returns:
        Audio stream (WAV)
    """
    try:
        logger.info(
            "🎤 Voice clone speak request - "
            f"User: {user_id}, "
            f"Profile: {profile_name}"
        )
        logger.info(f"Text length: {len(text)} chars")
        
        from voice_clone import get_voice_clone_service
        
        service = get_voice_clone_service()
        logger.info("Synthesizing with cloned voice...")
        
        audio_bytes = await service.synthesize_with_cloned_voice(
            text, user_id, profile_name, speed
        )
        
        logger.info(f"✅ Generated {len(audio_bytes)} bytes of audio")
        
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=cloned_speech.wav"
            }
        )
    
    except Exception as e:
        logger.error(f"❌ Cloned voice synthesis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/voice-clone/profiles/{user_id}")
async def get_user_voice_profiles(user_id: str):
    """Get all voice profiles for a user"""
    try:
        from voice_clone import get_voice_clone_service
        
        service = get_voice_clone_service()
        profiles = service.list_user_profiles(user_id)
        
        return {"user_id": user_id, "profiles": profiles}
    
    except Exception as e:
        logger.error(f"Error getting profiles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/voice-clone/profiles/{user_id}/{profile_name}")
async def delete_voice_profile(user_id: str, profile_name: str):
    """Delete a voice profile"""
    try:
        from voice_clone import get_voice_clone_service
        
        service = get_voice_clone_service()
        success = service.delete_profile(user_id, profile_name)
        
        if success:
            return {"message": "Profile deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Profile not found")
    
    except Exception as e:
        logger.error(f"Error deleting profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Memory Management ====================

@app.get("/memory/summary/{user_id}")
async def get_memory_summary(user_id: str):
    """Get summary of user's long-term memory"""
    try:
        from memory import get_memory_service
        
        service = get_memory_service()
        summary = service.get_user_summary(user_id)
        
        return summary
    
    except Exception as e:
        logger.error(f"Error getting memory summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/history/{user_id}")
async def get_memory_history(user_id: str, limit: int = 20):
    """Get conversation history from long-term memory"""
    try:
        from memory import get_memory_service
        
        service = get_memory_service()
        history = service.get_conversation_history(user_id, limit=limit)
        
        return {"user_id": user_id, "history": history, "count": len(history)}
    
    except Exception as e:
        logger.error(f"Error getting memory history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/{user_id}/messages")
async def get_messages_with_ids(user_id: str, limit: Optional[int] = None):
    """Get conversation messages with IDs for branching"""
    try:
        from memory import get_memory_service
        
        service = get_memory_service()
        
        # Get raw messages with IDs
        user_file = service._get_user_file(user_id)
        if not user_file.exists():
            return {"user_id": user_id, "messages": []}
        
        import json
        with open(user_file, 'r', encoding='utf-8') as f:
            memory = json.load(f)
        
        messages = memory.get("messages", [])
        
        if limit and len(messages) > limit:
            messages = messages[-limit:]
        
        return {"user_id": user_id, "messages": messages, "count": len(messages)}
    
    except Exception as e:
        logger.error(f"Error getting messages with IDs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/memory/{user_id}")
async def clear_memory(user_id: str):
    """Clear all long-term memory for a user"""
    try:
        from memory import get_memory_service
        
        service = get_memory_service()
        success = service.clear_user_memory(user_id)
        
        if success:
            return {"message": "Memory cleared successfully"}
        else:
            return {"message": "No memory found for user"}
    
    except Exception as e:
        logger.error(f"Error clearing memory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Conversation Branching ====================

class CreateBranchRequest(BaseModel):
    parent_message_id: str
    branch_name: Optional[str] = None
    branch_context: Optional[str] = None

@app.post("/branch/{conversation_id}")
async def create_branch(conversation_id: str, request: CreateBranchRequest):
    """Create a new conversation branch from a specific message"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        branch_id = service.create_branch(
            conversation_id=conversation_id,
            parent_message_id=request.parent_message_id,
            branch_name=request.branch_name,
            branch_context=request.branch_context
        )
        
        return {
            "branch_id": branch_id,
            "message": "Branch created successfully"
        }
    
    except Exception as e:
        logger.error(f"Error creating branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/branches/{conversation_id}")
async def get_branches(conversation_id: str):
    """Get all branches for a conversation"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        branches = service.get_branches(conversation_id)
        
        return {"branches": branches}
    
    except Exception as e:
        logger.error(f"Error getting branches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/branch/{conversation_id}/{branch_id}")
async def get_branch(conversation_id: str, branch_id: str):
    """Get a specific branch"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        branch = service.get_branch(conversation_id, branch_id)
        
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        return branch
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/branch/{conversation_id}/{branch_id}/activate")
async def activate_branch(conversation_id: str, branch_id: str):
    """Set a branch as the active conversation path"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        service.set_active_branch(conversation_id, branch_id)
        
        return {"message": "Branch activated"}
    
    except Exception as e:
        logger.error(f"Error activating branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/branch-tree/{conversation_id}")
async def get_branch_tree(conversation_id: str):
    """Get visual tree structure of all branches"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        tree = service.get_branch_tree(conversation_id)
        
        return tree
    
    except Exception as e:
        logger.error(f"Error getting branch tree: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/branch/{conversation_id}/{branch_id}")
async def delete_branch(conversation_id: str, branch_id: str):
    """Delete a conversation branch"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        service.delete_branch(conversation_id, branch_id)
        
        return {"message": "Branch deleted successfully"}
    
    except Exception as e:
        logger.error(f"Error deleting branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class BranchMessageRequest(BaseModel):
    text: str
    tone: str = "neutral"

@app.post("/branch/{conversation_id}/{branch_id}/message")
async def send_branch_message(
    conversation_id: str,
    branch_id: str,
    request: BranchMessageRequest
):
    """Send a message within a branch and get AI response"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        
        # Verify branch exists
        branch = service.get_branch(conversation_id, branch_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Get branch history for context
        branch_history = service.get_branch_history(conversation_id, branch_id)
        
        # Add user message to branch
        service.add_message_to_branch(
            conversation_id=conversation_id,
            branch_id=branch_id,
            role="user",
            content=request.text
        )
        
        # Generate AI response using orchestrator
        response_text = await orchestrator.generate_text_response(
            user_message=request.text,
            tone=request.tone,
            conversation_history=branch_history
        )
        
        # Add AI response to branch
        service.add_message_to_branch(
            conversation_id=conversation_id,
            branch_id=branch_id,
            role="assistant",
            content=response_text,
            metadata={"tone": request.tone}
        )
        
        return {
            "success": True,
            "response_text": response_text,
            "branch_id": branch_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending branch message: {str(e)}")
        try:
            from backend.llm import LLMServiceUnavailable, LLMRequestTooLarge
        except Exception:
            try:
                from .llm import LLMServiceUnavailable, LLMRequestTooLarge
            except Exception:
                LLMServiceUnavailable = None
                LLMRequestTooLarge = None

        if LLMRequestTooLarge and isinstance(e, LLMRequestTooLarge):
            raise HTTPException(status_code=413, detail=str(e))
        if LLMServiceUnavailable and isinstance(e, LLMServiceUnavailable):
            raise HTTPException(status_code=503, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/branch/{conversation_id}/{branch_id}/voice-message")
async def send_branch_voice_message(
    conversation_id: str,
    branch_id: str,
    audio: UploadFile = File(...),
    tone: str = Form("neutral")
):
    """Send a voice message within a branch and get AI audio response"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        
        # Verify branch exists
        branch = service.get_branch(conversation_id, branch_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Get branch history for context
        branch_history = service.get_branch_history(conversation_id, branch_id)
        
        # Process voice message
        audio_bytes = await audio.read()
        audio_stream = io.BytesIO(audio_bytes)
        
        # Transcribe user audio
        user_text = await orchestrator.transcribe_audio(audio_stream)
        
        # Add user message to branch
        service.add_message_to_branch(
            conversation_id=conversation_id,
            branch_id=branch_id,
            role="user",
            content=user_text
        )
        
        # Generate AI response
        response_text = await orchestrator.generate_text_response(
            user_message=user_text,
            tone=tone,
            conversation_history=branch_history
        )
        
        # Generate audio
        audio_response = await orchestrator.generate_audio_response(response_text, tone)
        
        # Add AI response to branch
        service.add_message_to_branch(
            conversation_id=conversation_id,
            branch_id=branch_id,
            role="assistant",
            content=response_text,
            metadata={"tone": tone}
        )
        
        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/mpeg",
            headers={
                "X-User-Text": user_text,
                "X-Response-Text": response_text
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending branch voice message: {str(e)}")
        try:
            from backend.llm import LLMServiceUnavailable, LLMRequestTooLarge
        except Exception:
            try:
                from .llm import LLMServiceUnavailable, LLMRequestTooLarge
            except Exception:
                LLMServiceUnavailable = None
                LLMRequestTooLarge = None

        if LLMRequestTooLarge and isinstance(e, LLMRequestTooLarge):
            raise HTTPException(status_code=413, detail=str(e))
        if LLMServiceUnavailable and isinstance(e, LLMServiceUnavailable):
            raise HTTPException(status_code=503, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/branch/{conversation_id}/{branch_id}/history")
async def get_branch_history(conversation_id: str, branch_id: str):
    """Get complete history of a branch including parent conversation"""
    try:
        from branching import get_branching_service
        
        service = get_branching_service()
        history = service.get_branch_history(conversation_id, branch_id, include_parent=True)
        
        return {
            "branch_id": branch_id,
            "history": history
        }
    
    except Exception as e:
        logger.error(f"Error getting branch history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Title Generation ====================

class GenerateTitleRequest(BaseModel):
    user_message: str
    ai_response: Optional[str] = None
    conversation_context: Optional[list] = None

@app.post("/generate-title")
async def generate_chat_title(request: GenerateTitleRequest):
    """Generate a smart title for a chat conversation"""
    try:
        from title_generator import get_title_generator
        
        generator = get_title_generator()
        title = await generator.generate_title(
            request.user_message,
            request.ai_response,
            request.conversation_context
        )
        
        return {"title": title}
    
    except Exception as e:
        logger.error(f"Error generating title: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Image Analysis ====================

@app.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    question: str = Form("What's in this image? Describe it in detail."),
    user_id: Optional[str] = Form(None)
):
    """
    Analyze an uploaded image and answer questions about it
    
    Args:
        image: Image file (JPEG, PNG, WebP, GIF)
        question: Question to ask about the image
        user_id: Optional user identifier
    
    Returns:
        JSON with analysis/answer
    """
    try:
        logger.info(f"🖼️  Image analysis request: {image.filename}")
        logger.info(f"Question: '{question[:100]}...'")
        
        from vision import get_vision_service
        
        # Read image bytes
        image_bytes = await image.read()
        logger.info(f"Image size: {len(image_bytes)} bytes")
        
        # Analyze image
        service = get_vision_service()
        answer = await service.analyze_image(image_bytes, question)
        
        logger.info(f"✅ Analysis complete ({len(answer)} chars)")
        
        return {
            "success": True,
            "answer": answer,
            "image_name": image.filename,
            "question": question
        }
    
    except Exception as e:
        logger.error(f"❌ Image analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/describe-image")
async def describe_image(
    image: UploadFile = File(...),
    user_id: Optional[str] = Form(None)
):
    """Get a detailed description of an image"""
    try:
        from vision import get_vision_service
        
        image_bytes = await image.read()
        service = get_vision_service()
        description = await service.describe_image(image_bytes)
        
        return {
            "success": True,
            "description": description,
            "image_name": image.filename
        }
    
    except Exception as e:
        logger.error(f"Error describing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-text")
async def extract_text_from_image(
    image: UploadFile = File(...),
    user_id: Optional[str] = Form(None)
):
    """Extract text from an image (OCR)"""
    try:
        from vision import get_vision_service
        
        image_bytes = await image.read()
        service = get_vision_service()
        text = await service.extract_text(image_bytes)
        
        return {
            "success": True,
            "text": text,
            "image_name": image.filename
        }
    
    except Exception as e:
        logger.error(f"Error extracting text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Audiobook Endpoints ====================

@app.post("/audiobook/upload")
async def upload_audiobook(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    voice: str = Form("lisa"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a novel/story file and create an audiobook
    Supports: PDF, TXT, EPUB, DOCX
    
    Args:
        file: Document file
        title: Book title (optional)
        author: Author name (optional)
        voice: TTS voice to use
        
    Returns:
        Audiobook metadata
    """
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.txt', '.epub', '.docx', '.doc']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        file_bytes = await file.read()
        
        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size is 50MB."
            )
        
        # Create audiobook
        audiobook_service = get_audiobook_service()
        metadata = await audiobook_service.create_audiobook(
            file_bytes=file_bytes,
            filename=file.filename,
            user_id=current_user.id,
            title=title,
            author=author,
            voice=voice,
            tts_provider=settings.TTS_PROVIDER
        )
        
        return {
            "success": True,
            "audiobook": metadata,
            "message": "Audiobook ready! Click 'Start Listening' to begin - AI will read in real-time."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audiobook upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/audiobook/{audiobook_id}/process")
async def process_audiobook(
    audiobook_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Start processing audiobook (generate audio for all chapters)
    
    Args:
        audiobook_id: Audiobook ID
        
    Returns:
        Processing status
    """
    try:
        # If server-side generation is disabled globally, do not start processing
        allow_server_generation = os.environ.get('ALLOW_SERVER_GENERATION', 'true').lower() == 'true'
        if not allow_server_generation:
            logger.info('Skipping processing because ALLOW_SERVER_GENERATION is false')
            raise HTTPException(status_code=403, detail='Server-side generation is disabled')

        audiobook_service = get_audiobook_service()
        
        # Verify audiobook exists and belongs to user
        audiobook = audiobook_service.get_audiobook(audiobook_id)
        if not audiobook:
            raise HTTPException(status_code=404, detail="Audiobook not found")
        
        if audiobook.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if audiobook.get("status") == "processing":
            return {
                "success": False,
                "message": "Audiobook is already being processed"
            }
        
        if audiobook.get("status") == "completed":
            return {
                "success": False,
                "message": "Audiobook has already been processed"
            }
        
        # Update status to processing immediately
        audiobook["status"] = "processing"
        import json
        metadata_path = audiobook_service.metadata_dir / f"{audiobook_id}.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(audiobook, f, indent=2)
        
        # Start background processing
        import asyncio
        from fastapi import BackgroundTasks
        
        tts_service = get_tts_service()
        
        # Process in background
        asyncio.create_task(
            audiobook_service.process_audiobook(
                audiobook_id=audiobook_id,
                tts_service=tts_service
            )
        )
        
        return {
            "success": True,
            "message": "Processing started",
            "audiobook_id": audiobook_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/audiobook/{audiobook_id}/generate-chapter-titles")
async def generate_chapter_titles(audiobook_id: str, current_user: User = Depends(get_current_user)):
    """
    Generate/enrich chapter titles for an existing audiobook using LLM
    """
    try:
        from title_generator import get_title_generator

        audiobook_service = get_audiobook_service()
        audiobook = audiobook_service.get_audiobook(audiobook_id)
        if not audiobook:
            raise HTTPException(status_code=404, detail="Audiobook not found")
        if audiobook.get('user_id') != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

        generator = get_title_generator()
        chapters = audiobook.get('chapters', [])
        updated = False
        for idx, ch in enumerate(chapters):
            current_title = ch.get('title') or ''
            # Only try to enrich if the title is generic
            if current_title and not current_title.lower().startswith('chapter') and not current_title.lower().startswith('part'):
                continue
            excerpt = ch.get('content', '')[:600]
            try:
                new_title = await generator.generate_title(excerpt, ai_response=None, conversation_context=None)
                if new_title and len(new_title.strip()) > 0:
                    chapters[idx]['title'] = new_title
                    updated = True
            except Exception:
                continue

        if updated:
            # Save metadata
            metadata_path = audiobook_service.metadata_dir / f"{audiobook_id}.json"
            audiobook['chapters'] = chapters
            with open(metadata_path, 'w', encoding='utf-8') as f:
                import json
                json.dump(audiobook, f, indent=2)

        return {"status": "ok", "chapters": chapters}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating chapter titles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audiobook processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audiobook/library")
async def get_audiobook_library(
    current_user: User = Depends(get_current_user)
):
    """
    Get all audiobooks for current user
    
    Returns:
        List of audiobooks
    """
    try:
        audiobook_service = get_audiobook_service()
        audiobooks = audiobook_service.get_user_audiobooks(current_user.id)
        
        return {
            "audiobooks": audiobooks,
            "total": len(audiobooks)
        }
    
    except Exception as e:
        logger.error(f"Error fetching audiobook library: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audiobook/{audiobook_id}")
async def get_audiobook(
    audiobook_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get audiobook metadata and status
    
    Args:
        audiobook_id: Audiobook ID
        
    Returns:
        Audiobook metadata
    """
    try:
        audiobook_service = get_audiobook_service()
        audiobook = audiobook_service.get_audiobook(audiobook_id)
        
        if not audiobook:
            raise HTTPException(status_code=404, detail="Audiobook not found")
        
        if audiobook.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return audiobook
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching audiobook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audiobook/{audiobook_id}/chapter/{chapter_number}")
async def get_chapter_audio(
    audiobook_id: str,
    chapter_number: int,
    generate: bool = True,
    voice: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get audio file for a specific chapter
    If chapter doesn't exist and generate=True, generates it on-demand
    
    Args:
        audiobook_id: Audiobook ID
        chapter_number: Chapter number (1-indexed)
        generate: Generate audio on-demand if not found (default: True)
        
    Returns:
        Audio file (MP3)
    """
    try:
        # Allow an environment-level override to disable server-side generation entirely
        allow_server_generation = os.environ.get('ALLOW_SERVER_GENERATION', 'true').lower() == 'true'
        if not allow_server_generation:
            generate = False

        audiobook_service = get_audiobook_service()
        
        # Verify access
        audiobook = audiobook_service.get_audiobook(audiobook_id)
        if not audiobook:
            raise HTTPException(status_code=404, detail="Audiobook not found")
        
        if audiobook.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Try to get existing chapter audio; prefer voice-specific cache if voice param provided
        audio_bytes = audiobook_service.get_chapter_audio(audiobook_id, chapter_number, voice_override=voice)
        
        # If not found and generate=True, generate it now
        if not audio_bytes and generate:
            logger.info(f"🎙️ Generating audio on-demand for chapter {chapter_number}")
            
            tts_service = get_tts_service()
            
            # Generate audio for this chapter
            audio_path = await audiobook_service.generate_audio_for_chapter(
                audiobook_id=audiobook_id,
                chapter_number=chapter_number,
                tts_service=tts_service
                ,voice_override=voice
            )
            
            # Read the generated audio (respect voice override)
            audio_bytes = audiobook_service.get_chapter_audio(audiobook_id, chapter_number, voice_override=voice)
            
            # Update metadata to mark chapter as complete
            import json
            metadata_path = audiobook_service.metadata_dir / f"{audiobook_id}.json"
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            metadata["current_chapter"] = max(
                metadata.get("current_chapter", 0), 
                chapter_number
            )
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
        
        if not audio_bytes:
            raise HTTPException(status_code=404, detail="Chapter audio not found")
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename=chapter_{chapter_number}.mp3"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching chapter audio: {str(e)}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"{str(e)}")

@app.get("/audiobook/{audiobook_id}/stream")
async def stream_audiobook(
    audiobook_id: str,
    start_chapter: int = 1,
    voice: Optional[str] = None,
    generate: bool = True,
    current_user: User = Depends(get_current_user)
):
    """
    Stream audiobook from a specific chapter, generating audio on-the-fly
    Generates and returns audio immediately while saving chapters in background
    
    Args:
        audiobook_id: Audiobook ID
        start_chapter: Chapter to start from (default: 1)
        
    Returns:
        Streaming audio response
    """
    from fastapi.responses import StreamingResponse
    import asyncio
    
    try:
        # Respect global toggle to prevent server-side audio generation if configured
        allow_server_generation = os.environ.get('ALLOW_SERVER_GENERATION', 'true').lower() == 'true'
        if not allow_server_generation:
            generate = False

        audiobook_service = get_audiobook_service()
        
        # Verify access
        audiobook = audiobook_service.get_audiobook(audiobook_id)
        if not audiobook:
            raise HTTPException(status_code=404, detail="Audiobook not found")
        
        if audiobook.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update status to processing if not already
        if audiobook.get("status") != "processing":
            audiobook["status"] = "processing"
            import json
            metadata_path = audiobook_service.metadata_dir / f"{audiobook_id}.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(audiobook, f, indent=2)
        
        tts_service = get_tts_service()
        
        async def audio_generator():
            """Generate audio chunks on-the-fly"""
            chapters = audiobook.get("chapters", [])
            total_chapters = len(chapters)
            
            # Process ALL chapters from start_chapter to end
            logger.info(f"🎵 Streaming from chapter {start_chapter} to {total_chapters}")
            
            for idx in range(start_chapter - 1, total_chapters):
                chapter = chapters[idx]
                chapter_number = idx + 1
                
                try:
                    logger.info(f"🎵 Streaming chapter {chapter_number}/{total_chapters}")
                    
                    # Check if chapter audio already exists; prefer voice-specific cached file when voice override provided
                    audio_path = None
                    if voice:
                        import re
                        safe_voice = re.sub(r"[^a-zA-Z0-9_-]", "_", voice)
                        audio_filename_vo = f"{audiobook_id}_chapter_{chapter_number:03d}_{safe_voice}.mp3"
                        audio_path_vo = audiobook_service.audio_dir / audio_filename_vo
                        if audio_path_vo.exists():
                            audio_path = audio_path_vo
                    if not audio_path:
                        audio_filename = f"{audiobook_id}_chapter_{chapter_number:03d}.mp3"
                        audio_path = audiobook_service.audio_dir / audio_filename

                    if audio_path and audio_path.exists():
                        # Chapter already generated (default or voice-specific), stream it
                        logger.info(f"✅ Using cached audio for chapter {chapter_number}")
                        with open(audio_path, 'rb') as f:
                            audio_bytes = f.read()
                    else:
                        # If audio is missing and generate is False, don't synthesize - indicate missing audio so frontend can fallback to client TTS
                        if not generate:
                            logger.info(f"Skipping TTS generation for chapter {chapter_number} due to generate=False")
                            raise HTTPException(status_code=404, detail="Audio not found and generation skipped")
                        # Generate audio on-the-fly using audiobook service
                        logger.info(f"🎙️ Generating audio for chapter {chapter_number}")
                        audio_path_str = await audiobook_service.generate_audio_for_chapter(
                            audiobook_id=audiobook_id,
                            chapter_number=chapter_number,
                            tts_service=tts_service,
                            voice_override=voice
                        )
                        # Read the generated audio file
                        with open(audio_path_str, 'rb') as f:
                            audio_bytes = f.read()
                    
                    # Stream audio chunk
                    yield audio_bytes
                    
                    # Small delay between chapters
                    await asyncio.sleep(0.1)
                
                except Exception as e:
                    logger.error(f"❌ Error streaming chapter {chapter_number}: {e}")
                    continue
            
            # Mark as completed when done
            audiobook["status"] = "completed"
            audiobook["current_chapter"] = total_chapters
            audiobook["completed_at"] = datetime.now().isoformat()
            import json
            metadata_path = audiobook_service.metadata_dir / f"{audiobook_id}.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(audiobook, f, indent=2)
            
            logger.info(f"✅ Streaming completed for audiobook {audiobook_id}")
        
        return StreamingResponse(
            audio_generator(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename={audiobook.get('title', 'audiobook')}.mp3",
                "X-Accel-Buffering": "no"  # Disable buffering for true streaming
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming audiobook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def save_chapter_audio(
    audiobook_service,
    audiobook_id: str,
    chapter_number: int,
    audio_bytes: bytes,
    audio_path
):
    """Background task to save chapter audio"""
    try:
        with open(audio_path, 'wb') as f:
            f.write(audio_bytes)
        
        # Update metadata
        import json
        metadata_path = audiobook_service.metadata_dir / f"{audiobook_id}.json"
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # Add to audio_files list
        if "audio_files" not in metadata:
            metadata["audio_files"] = []
        
        # Check if not already added
        if not any(af.get("chapter_number") == chapter_number for af in metadata["audio_files"]):
            metadata["audio_files"].append({
                "chapter_number": chapter_number,
                "audio_path": str(audio_path),
                "duration": None
            })
        
        # Update current_chapter
        metadata["current_chapter"] = max(metadata.get("current_chapter", 0), chapter_number)
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"💾 Saved chapter {chapter_number} audio to disk")
    
    except Exception as e:
        logger.error(f"Error saving chapter audio: {e}")


@app.delete("/audiobook/{audiobook_id}")
async def delete_audiobook(
    audiobook_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an audiobook and all its files
    
    Args:
        audiobook_id: Audiobook ID
        
    Returns:
        Deletion status
    """
    try:
        audiobook_service = get_audiobook_service()
        
        success = audiobook_service.delete_audiobook(audiobook_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Audiobook not found or access denied"
            )
        
        return {
            "success": True,
            "message": "Audiobook deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting audiobook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
