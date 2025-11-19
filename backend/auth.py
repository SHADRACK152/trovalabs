"""
Authentication and Authorization Service
Handles user registration, login, and JWT token management
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from models import User

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "your-secret-key-change-this-in-production"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


class AuthService:
    """Authentication service for user management"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT access token
        
        Args:
            data: Data to encode in token (typically user_id, email)
            expires_delta: Token expiration time
            
        Returns:
            JWT token string
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token data or None if invalid
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.JWTError as e:
            logger.warning(f"Token verification failed: {str(e)}")
            return None
    
    @staticmethod
    def register_user(
        db: Session,
        email: str,
        username: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        """
        Register a new user
        
        Args:
            db: Database session
            email: User email
            username: Username
            password: Plain text password
            full_name: Optional full name
            
        Returns:
            Created User object
            
        Raises:
            ValueError: If user already exists
        """
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        
        if existing_user:
            if existing_user.email == email:
                raise ValueError("Email already registered")
            else:
                raise ValueError("Username already taken")
        
        # Create new user
        user_id = f"user_{username}_{datetime.utcnow().timestamp()}"
        hashed_password = AuthService.hash_password(password)
        
        new_user = User(
            id=user_id,
            email=email,
            username=username,
            password_hash=hashed_password,
            full_name=full_name,
            is_active=True,
            is_verified=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"✅ New user registered: {username} ({email})")
        return new_user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user with email and password
        
        Args:
            db: Database session
            email: User email
            password: Plain text password
            
        Returns:
            User object if authenticated, None otherwise
        """
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logger.warning(f"Login attempt for non-existent user: {email}")
            return None
        
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {email}")
            return None
        
        if not AuthService.verify_password(password, user.password_hash):
            logger.warning(f"Invalid password for user: {email}")
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        logger.info(f"✅ User authenticated: {email}")
        return user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def update_user_profile(
        db: Session,
        user_id: str,
        full_name: Optional[str] = None,
        bio: Optional[str] = None,
        avatar_url: Optional[str] = None,
        preferred_tone: Optional[str] = None,
        preferred_voice: Optional[str] = None,
        language: Optional[str] = None,
        personality_traits: Optional[dict] = None,
        interests: Optional[list] = None,
        conversation_style: Optional[str] = None
    ) -> Optional[User]:
        """
        Update user profile information
        
        Args:
            db: Database session
            user_id: User ID
            **kwargs: Profile fields to update
            
        Returns:
            Updated User object or None if not found
        """
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return None
        
        # Update fields if provided
        if full_name is not None:
            user.full_name = full_name
        if bio is not None:
            user.bio = bio
        if avatar_url is not None:
            user.avatar_url = avatar_url
        if preferred_tone is not None:
            user.preferred_tone = preferred_tone
        if preferred_voice is not None:
            user.preferred_voice = preferred_voice
        if language is not None:
            user.language = language
        if personality_traits is not None:
            user.personality_traits = personality_traits
        if interests is not None:
            user.interests = interests
        if conversation_style is not None:
            user.conversation_style = conversation_style
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        logger.info(f"✅ Profile updated for user: {user.username}")
        return user
    
    @staticmethod
    def get_or_create_oauth_user(
        db: Session,
        email: str,
        username: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        oauth_provider: str = "google"
    ) -> User:
        """
        Get existing user or create new user for OAuth login
        
        Args:
            db: Database session
            email: User email from OAuth provider
            username: Username (generated from email if needed)
            full_name: Full name from OAuth provider
            avatar_url: Avatar URL from OAuth provider
            oauth_provider: OAuth provider name (google, github, microsoft)
            
        Returns:
            User object
        """
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Update OAuth info if changed
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
            if full_name and user.full_name != full_name:
                user.full_name = full_name
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
            logger.info(f"✅ Existing OAuth user logged in: {user.username} via {oauth_provider}")
            return user
        
        # Create new user for OAuth
        import uuid
        user_id = str(uuid.uuid4())
        password_hash = AuthService.hash_password(str(uuid.uuid4()))  # Random password for OAuth users
        
        new_user = User(
            id=user_id,
            email=email,
            username=username,
            password_hash=password_hash,
            full_name=full_name or username,
            avatar_url=avatar_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"✅ New OAuth user created: {new_user.username} via {oauth_provider}")
        return new_user
