"""
Database Models for Lumino AI
SQLAlchemy ORM models for conversations, messages, and branches
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    """User model - stores user information and profile"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    
    # Profile information
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Personalization preferences
    preferred_tone = Column(String, default="neutral")  # calm, neutral, energetic
    preferred_voice = Column(String, nullable=True)  # For TTS
    language = Column(String, default="en")
    
    # AI Personalization settings
    personality_traits = Column(JSON, nullable=True)  # e.g., {"formality": "casual", "humor": "high"}
    interests = Column(JSON, nullable=True)  # User interests for context
    conversation_style = Column(String, default="balanced")  # concise, balanced, detailed
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


class Conversation(Base):
    """Conversation model - represents a chat session"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    branches = relationship("Branch", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Message model - stores individual messages in conversations"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    tone = Column(String, nullable=True)  # For assistant messages
    extra_data = Column(JSON, nullable=True)  # Store additional data as JSON (renamed from metadata)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class Branch(Base):
    """Branch model - represents conversation branches (What if? scenarios)"""
    __tablename__ = "branches"
    
    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    parent_message_id = Column(String, nullable=False)
    branch_name = Column(String, nullable=True)
    branch_context = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="branches")
    messages = relationship("BranchMessage", back_populates="branch", cascade="all, delete-orphan")


class BranchMessage(Base):
    """Branch message model - messages within a branch"""
    __tablename__ = "branch_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    tone = Column(String, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Store additional data as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    branch = relationship("Branch", back_populates="messages")


class Audiobook(Base):
    """Audiobook model - stores audiobook metadata"""
    __tablename__ = "audiobooks"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Book information
    title = Column(String, nullable=False)
    author = Column(String, default="Unknown")
    original_filename = Column(String, nullable=False)
    
    # Processing info
    status = Column(String, default="pending")  # pending, processing, completed, failed
    voice = Column(String, default="lisa")
    tts_provider = Column(String, default="gtts")
    
    # Content stats
    word_count = Column(Integer, default=0)
    character_count = Column(Integer, default=0)
    chapter_count = Column(Integer, default=0)
    
    # File paths
    upload_path = Column(String, nullable=False)
    
    # Metadata
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="audiobooks")
    chapters = relationship("AudiobookChapter", back_populates="audiobook", cascade="all, delete-orphan")


class AudiobookChapter(Base):
    """Audiobook chapter model - stores individual chapter data"""
    __tablename__ = "audiobook_chapters"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    audiobook_id = Column(String, ForeignKey("audiobooks.id"), nullable=False)
    
    chapter_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    
    # Audio info
    audio_path = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    char_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    audiobook = relationship("Audiobook", back_populates="chapters")
