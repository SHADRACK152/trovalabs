"""
Database Service Layer
Handles all database operations for conversations, messages, and branches
"""
import logging
from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models import User, Conversation, Message, Branch, BranchMessage
from database import SessionLocal

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for database operations"""
    
    def __init__(self):
        logger.info("🗄️  Database Service initialized")
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return SessionLocal()
    
    # ==================== User Operations ====================
    
    def get_or_create_user(self, user_id: str) -> User:
        """Get user or create if doesn't exist"""
        with self.get_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                user = User(id=user_id)
                db.add(user)
                db.commit()
                db.refresh(user)
                logger.info(f"👤 Created new user: {user_id[:8]}...")
            return user
    
    # ==================== Conversation Operations ====================
    
    def create_conversation(self, user_id: str, conversation_id: str, title: str = "New Chat") -> Conversation:
        """Create a new conversation"""
        with self.get_session() as db:
            # Ensure user exists
            self.get_or_create_user(user_id)
            
            conversation = Conversation(
                id=conversation_id,
                user_id=user_id,
                title=title
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            logger.info(f"💬 Created conversation: {conversation_id}")
            return conversation
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID"""
        with self.get_session() as db:
            return db.query(Conversation).filter(Conversation.id == conversation_id).first()
    
    def get_user_conversations(self, user_id: str, limit: int = 20) -> List[Conversation]:
        """Get all conversations for a user"""
        with self.get_session() as db:
            return db.query(Conversation).filter(
                Conversation.user_id == user_id
            ).order_by(desc(Conversation.updated_at)).limit(limit).all()
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update conversation title"""
        with self.get_session() as db:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conversation:
                conversation.title = title
                conversation.updated_at = datetime.utcnow()
                db.commit()
                return True
            return False
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and all its messages"""
        with self.get_session() as db:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conversation:
                db.delete(conversation)
                db.commit()
                logger.info(f"🗑️  Deleted conversation: {conversation_id}")
                return True
            return False
    
    # ==================== Message Operations ====================
    
    def add_message(
        self,
        conversation_id: str,
        message_id: str,
        role: str,
        content: str,
        tone: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Message:
        """Add a message to a conversation"""
        with self.get_session() as db:
            message = Message(
                id=message_id,
                conversation_id=conversation_id,
                role=role,
                content=content,
                tone=tone,
                metadata=metadata
            )
            db.add(message)
            
            # Update conversation timestamp
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conversation:
                conversation.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(message)
            return message
    
    def get_conversation_messages(self, conversation_id: str, limit: Optional[int] = None) -> List[Message]:
        """Get all messages for a conversation"""
        with self.get_session() as db:
            query = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at)
            if limit:
                query = query.limit(limit)
            return query.all()
    
    def get_message_by_id(self, message_id: str) -> Optional[Message]:
        """Get a specific message by ID"""
        with self.get_session() as db:
            return db.query(Message).filter(Message.id == message_id).first()
    
    def get_messages_until(self, conversation_id: str, message_id: str) -> List[Message]:
        """Get messages up to and including a specific message"""
        with self.get_session() as db:
            target_message = db.query(Message).filter(Message.id == message_id).first()
            if not target_message:
                return []
            
            return db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.created_at <= target_message.created_at
            ).order_by(Message.created_at).all()
    
    # ==================== Branch Operations ====================
    
    def create_branch(
        self,
        branch_id: str,
        conversation_id: str,
        parent_message_id: str,
        branch_name: Optional[str] = None,
        branch_context: Optional[str] = None
    ) -> Branch:
        """Create a new branch"""
        with self.get_session() as db:
            branch = Branch(
                id=branch_id,
                conversation_id=conversation_id,
                parent_message_id=parent_message_id,
                branch_name=branch_name,
                branch_context=branch_context
            )
            db.add(branch)
            db.commit()
            db.refresh(branch)
            logger.info(f"🌳 Created branch: {branch_id}")
            return branch
    
    def get_branch(self, branch_id: str) -> Optional[Branch]:
        """Get a branch by ID"""
        with self.get_session() as db:
            return db.query(Branch).filter(Branch.id == branch_id).first()
    
    def get_conversation_branches(self, conversation_id: str) -> List[Branch]:
        """Get all branches for a conversation"""
        with self.get_session() as db:
            return db.query(Branch).filter(Branch.conversation_id == conversation_id).all()
    
    def set_active_branch(self, conversation_id: str, branch_id: Optional[str]) -> bool:
        """Set a branch as active"""
        with self.get_session() as db:
            # Deactivate all branches
            db.query(Branch).filter(Branch.conversation_id == conversation_id).update({"is_active": False})
            
            # Activate specified branch
            if branch_id:
                branch = db.query(Branch).filter(Branch.id == branch_id).first()
                if branch:
                    branch.is_active = True
            
            db.commit()
            return True
    
    def delete_branch(self, branch_id: str) -> bool:
        """Delete a branch"""
        with self.get_session() as db:
            branch = db.query(Branch).filter(Branch.id == branch_id).first()
            if branch:
                db.delete(branch)
                db.commit()
                logger.info(f"🗑️  Deleted branch: {branch_id}")
                return True
            return False
    
    def add_branch_message(
        self,
        branch_id: str,
        role: str,
        content: str,
        tone: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> BranchMessage:
        """Add a message to a branch"""
        with self.get_session() as db:
            message = BranchMessage(
                branch_id=branch_id,
                role=role,
                content=content,
                tone=tone,
                metadata=metadata
            )
            db.add(message)
            
            # Update branch timestamp
            branch = db.query(Branch).filter(Branch.id == branch_id).first()
            if branch:
                branch.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(message)
            return message
    
    def get_branch_messages(self, branch_id: str) -> List[BranchMessage]:
        """Get all messages in a branch"""
        with self.get_session() as db:
            return db.query(BranchMessage).filter(
                BranchMessage.branch_id == branch_id
            ).order_by(BranchMessage.created_at).all()


# Global instance
_db_service = None


def get_db_service() -> DatabaseService:
    """Get or create database service instance"""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service
