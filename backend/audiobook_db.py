"""
Database service for audiobook operations
Handles all database interactions for audiobooks
"""
import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from models import Audiobook, AudiobookChapter

logger = logging.getLogger(__name__)


class AudiobookDBService:
    """Service for audiobook database operations"""
    
    @staticmethod
    def create_audiobook(
        db: Session,
        audiobook_id: str,
        user_id: str,
        title: str,
        author: str,
        original_filename: str,
        upload_path: str,
        voice: str = "lisa",
        tts_provider: str = "gtts",
        word_count: int = 0,
        character_count: int = 0
    ) -> Audiobook:
        """Create a new audiobook record"""
        audiobook = Audiobook(
            id=audiobook_id,
            user_id=user_id,
            title=title,
            author=author,
            original_filename=original_filename,
            upload_path=upload_path,
            voice=voice,
            tts_provider=tts_provider,
            word_count=word_count,
            character_count=character_count,
            status="pending"
        )
        db.add(audiobook)
        db.commit()
        db.refresh(audiobook)
        return audiobook
    
    @staticmethod
    def get_audiobook(db: Session, audiobook_id: str) -> Optional[Audiobook]:
        """Get an audiobook by ID"""
        return db.query(Audiobook).filter(
            Audiobook.id == audiobook_id
        ).first()
    
    @staticmethod
    def get_user_audiobooks(db: Session, user_id: str) -> List[Audiobook]:
        """Get all audiobooks for a user"""
        return db.query(Audiobook).filter(
            Audiobook.user_id == user_id
        ).order_by(Audiobook.created_at.desc()).all()
    
    @staticmethod
    def update_audiobook_status(
        db: Session,
        audiobook_id: str,
        status: str,
        error_message: Optional[str] = None
    ) -> Optional[Audiobook]:
        """Update audiobook processing status"""
        audiobook = db.query(Audiobook).filter(
            Audiobook.id == audiobook_id
        ).first()
        
        if audiobook:
            audiobook.status = status
            audiobook.updated_at = datetime.utcnow()
            
            if status == "completed":
                audiobook.completed_at = datetime.utcnow()
            
            if error_message:
                audiobook.error_message = error_message
            
            db.commit()
            db.refresh(audiobook)
        
        return audiobook
    
    @staticmethod
    def update_chapter_count(
        db: Session,
        audiobook_id: str,
        chapter_count: int
    ) -> Optional[Audiobook]:
        """Update the chapter count for an audiobook"""
        audiobook = db.query(Audiobook).filter(
            Audiobook.id == audiobook_id
        ).first()
        
        if audiobook:
            audiobook.chapter_count = chapter_count
            audiobook.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(audiobook)
        
        return audiobook
    
    @staticmethod
    def create_chapter(
        db: Session,
        audiobook_id: str,
        chapter_number: int,
        title: str,
        text: str,
        char_count: int,
        audio_path: Optional[str] = None,
        duration_seconds: Optional[int] = None
    ) -> AudiobookChapter:
        """Create a new chapter record"""
        chapter = AudiobookChapter(
            audiobook_id=audiobook_id,
            chapter_number=chapter_number,
            title=title,
            text=text,
            char_count=char_count,
            audio_path=audio_path,
            duration_seconds=duration_seconds
        )
        db.add(chapter)
        db.commit()
        db.refresh(chapter)
        return chapter
    
    @staticmethod
    def get_chapters(
        db: Session,
        audiobook_id: str
    ) -> List[AudiobookChapter]:
        """Get all chapters for an audiobook"""
        return db.query(AudiobookChapter).filter(
            AudiobookChapter.audiobook_id == audiobook_id
        ).order_by(AudiobookChapter.chapter_number).all()
    
    @staticmethod
    def get_chapter(
        db: Session,
        audiobook_id: str,
        chapter_number: int
    ) -> Optional[AudiobookChapter]:
        """Get a specific chapter"""
        return db.query(AudiobookChapter).filter(
            AudiobookChapter.audiobook_id == audiobook_id,
            AudiobookChapter.chapter_number == chapter_number
        ).first()
    
    @staticmethod
    def update_chapter_audio(
        db: Session,
        audiobook_id: str,
        chapter_number: int,
        audio_path: str,
        duration_seconds: Optional[int] = None
    ) -> Optional[AudiobookChapter]:
        """Update chapter audio information"""
        chapter = db.query(AudiobookChapter).filter(
            AudiobookChapter.audiobook_id == audiobook_id,
            AudiobookChapter.chapter_number == chapter_number
        ).first()
        
        if chapter:
            chapter.audio_path = audio_path
            if duration_seconds:
                chapter.duration_seconds = duration_seconds
            db.commit()
            db.refresh(chapter)
        
        return chapter
    
    @staticmethod
    def delete_audiobook(
        db: Session,
        audiobook_id: str,
        user_id: str
    ) -> bool:
        """Delete an audiobook and all its chapters"""
        audiobook = db.query(Audiobook).filter(
            Audiobook.id == audiobook_id,
            Audiobook.user_id == user_id
        ).first()
        
        if audiobook:
            db.delete(audiobook)
            db.commit()
            return True
        
        return False
