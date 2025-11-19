"""
Long-term Memory Service
Stores and retrieves conversation history across sessions
"""
import logging
import json
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime
import hashlib
import re
from config import settings

logger = logging.getLogger(__name__)


class MemoryService:
    """
    Long-term memory storage for conversations
    Persists user conversations across sessions
    """
    
    def __init__(self, storage_dir: str = "memory_storage"):
        """Initialize memory service"""
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        # Global knowledge base for cross-user memory (if enabled in config)
        self.global_file = self.storage_dir / "global_memory.json"
        if self.global_file.exists():
            try:
                with open(self.global_file, 'r', encoding='utf-8') as f:
                    self.global_kb = json.load(f)
            except Exception:
                self.global_kb = {"entries": [], "index": {}}
        else:
            self.global_kb = {"entries": [], "index": {}}
        logger.info(f"🧠 Memory Service initialized (storage: {self.storage_dir})")
    
    def _get_user_file(self, user_id: str) -> Path:
        """Get the memory file path for a user"""
        # Hash user_id for privacy and filename safety
        user_hash = hashlib.md5(user_id.encode()).hexdigest()[:16]
        return self.storage_dir / f"user_{user_hash}.json"

    def _get_global_file(self) -> Path:
        return self.global_file

    def _normalize_text(self, text: str) -> List[str]:
        """Tokenize and normalize text for simple keyword indexing"""
        if not text:
            return []
        # lowercase, remove punctuation
        text = re.sub(r"[^a-zA-Z0-9\s]", " ", text).lower()
        tokens = [t for t in text.split() if len(t) > 3]
        # simple stopwords list
        stopwords = {
            "about", "this", "that", "there", "their", "what", "when",
            "which", "would", "could", "should", "have", "has", "had",
            "with", "from", "your", "youre", "you're", "like", "just",
            "also", "then", "them", "they"
        }
        tokens = [t for t in tokens if t not in stopwords]
        return list(dict.fromkeys(tokens))  # unique tokens preserving order

    def _index_global_message(self, user_id: str, message_id: str, content: str, metadata: Optional[Dict] = None):
        """Index a message into the global knowledge base"""
        try:
            tokens = self._normalize_text(content)
            entry_id = f"global_{len(self.global_kb.get('entries', []))}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            entry = {
                "id": entry_id,
                "user_id": user_id,
                "message_id": message_id,
                "content": content,
                "tokens": tokens,
                "timestamp": datetime.now().isoformat(),
            }
            if metadata:
                entry["metadata"] = metadata

            self.global_kb.setdefault('entries', []).append(entry)
            # Update inverted index
            index = self.global_kb.setdefault('index', {})
            for t in tokens:
                index.setdefault(t, []).append(entry_id)

            # Keep moderate size: prune entries if too many
            if len(self.global_kb['entries']) > 5000:
                # remove oldest 1000 entries and rebuild index
                self.global_kb['entries'] = self.global_kb['entries'][-4000:]
                index.clear()
                for e in self.global_kb['entries']:
                    for t in e.get('tokens', []):
                        index.setdefault(t, []).append(e['id'])

            # Persist global KB
            with open(self._get_global_file(), 'w', encoding='utf-8') as gf:
                json.dump(self.global_kb, gf, indent=2, ensure_ascii=False)

            logger.debug(f"Indexed message to global KB: {entry_id} (tokens: {len(tokens)})")
            return True
        except Exception as e:
            logger.error(f"Error indexing global message: {e}")
            return False

    def retrieve_related_memory(self, query: str, limit: int = 5) -> List[Dict]:
        """Retrieve related global KB entries that match the query by token overlap

        This uses a simple keyword overlap scoring. If needed, swap to an embedding
        based retrieval later for better semantics.
        """
        try:
            if not getattr(settings, 'GLOBAL_MEMORY_ENABLED', False):
                return []
            tokens = self._normalize_text(query)
            if not tokens:
                return []
            index = self.global_kb.get('index', {})
            # Score entries by number of matched tokens
            scores = {}
            for t in tokens:
                for eid in index.get(t, []):
                    scores[eid] = scores.get(eid, 0) + 1
            # Sort entry IDs by score desc
            ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
            results = []
            entries_map = {e['id']: e for e in self.global_kb.get('entries', [])}
            for eid, score in ranked[:limit]:
                entry = entries_map.get(eid)
                if entry:
                    results.append({
                        'id': entry['id'],
                        'content': entry['content'],
                        'user_id': entry['user_id'],
                        'score': score,
                        'timestamp': entry.get('timestamp')
                    })
            return results
        except Exception as e:
            logger.error(f"Error retrieving related memory: {e}")
            return []
    
    def save_message(
        self,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Save a message to long-term memory
        
        Args:
            user_id: User identifier
            role: Message role (user/assistant)
            content: Message content
            metadata: Optional metadata (tone, timestamp, etc.)
        
        Returns:
            True if saved successfully
        """
        try:
            user_file = self._get_user_file(user_id)
            
            # Load existing memory or create new
            if user_file.exists():
                with open(user_file, 'r', encoding='utf-8') as f:
                    memory = json.load(f)
            else:
                memory = {
                    "user_id": user_id,
                    "created_at": datetime.now().isoformat(),
                    "messages": []
                }
            
            # Add new message with unique ID
            message_id = f"msg_{len(memory['messages'])}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            message = {
                "id": message_id,
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            }
            
            if metadata:
                message["metadata"] = metadata
            
            memory["messages"].append(message)
            memory["updated_at"] = datetime.now().isoformat()
            
            # Keep only last 100 messages to manage file size
            if len(memory["messages"]) > 100:
                memory["messages"] = memory["messages"][-100:]
            
            # Save to file
            with open(user_file, 'w', encoding='utf-8') as f:
                json.dump(memory, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"💾 Saved message for user {user_id[:8]}... (total: {len(memory['messages'])})")
            # Also add to global KB if enabled
            if getattr(settings, 'GLOBAL_MEMORY_ENABLED', False):
                try:
                    self._index_global_message(user_id, message_id, content, metadata)
                except Exception as e:
                    logger.warning(f"Could not index message in global memory: {e}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return False
    
    def get_conversation_history(
        self,
        user_id: str,
        limit: Optional[int] = 20
    ) -> List[Dict]:
        """
        Retrieve conversation history for a user
        
        Args:
            user_id: User identifier
            limit: Maximum number of messages to return (default: 20)
        
        Returns:
            List of messages in format [{"role": "user/assistant", "content": "..."}]
        """
        try:
            user_file = self._get_user_file(user_id)
            
            if not user_file.exists():
                logger.debug(f"No memory found for user {user_id[:8]}...")
                return []
            
            with open(user_file, 'r', encoding='utf-8') as f:
                memory = json.load(f)
            
            messages = memory.get("messages", [])
            
            # Return last N messages
            if limit and len(messages) > limit:
                messages = messages[-limit:]
            
            # Convert to simple format for LLM
            conversation = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in messages
            ]
            
            logger.info(f"🧠 Retrieved {len(conversation)} messages for user {user_id[:8]}...")
            return conversation
            
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}")
            return []
    
    def get_message_by_id(self, user_id: str, message_id: str) -> Optional[Dict]:
        """
        Get a specific message by ID
        
        Args:
            user_id: User identifier
            message_id: Message ID to retrieve
        
        Returns:
            Message dict or None if not found
        """
        try:
            user_file = self._get_user_file(user_id)
            
            if not user_file.exists():
                return None
            
            with open(user_file, 'r', encoding='utf-8') as f:
                memory = json.load(f)
            
            messages = memory.get("messages", [])
            
            for msg in messages:
                if msg.get("id") == message_id:
                    return msg
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving message by ID: {e}")
            return None
    
    def get_conversation_until_message(
        self,
        user_id: str,
        message_id: str
    ) -> List[Dict]:
        """
        Get conversation history up to and including a specific message
        
        Args:
            user_id: User identifier
            message_id: Message ID to retrieve up to
        
        Returns:
            List of messages up to the specified message
        """
        try:
            user_file = self._get_user_file(user_id)
            
            if not user_file.exists():
                return []
            
            with open(user_file, 'r', encoding='utf-8') as f:
                memory = json.load(f)
            
            messages = memory.get("messages", [])
            result = []
            
            for msg in messages:
                result.append({"role": msg["role"], "content": msg["content"]})
                if msg.get("id") == message_id:
                    break
            
            logger.info(f"Retrieved {len(result)} messages up to {message_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving conversation until message: {e}")
            return []
    
    def get_user_summary(self, user_id: str) -> Dict:
        """
        Get summary information about user's memory
        
        Returns:
            Dict with user stats (message count, created date, etc.)
        """
        try:
            user_file = self._get_user_file(user_id)
            
            if not user_file.exists():
                return {
                    "exists": False,
                    "message_count": 0
                }
            
            with open(user_file, 'r', encoding='utf-8') as f:
                memory = json.load(f)
            
            return {
                "exists": True,
                "message_count": len(memory.get("messages", [])),
                "created_at": memory.get("created_at"),
                "updated_at": memory.get("updated_at")
            }
            
        except Exception as e:
            logger.error(f"Error getting user summary: {e}")
            return {"exists": False, "error": str(e)}
    
    def clear_user_memory(self, user_id: str) -> bool:
        """
        Clear all memory for a user
        
        Args:
            user_id: User identifier
        
        Returns:
            True if cleared successfully
        """
        try:
            user_file = self._get_user_file(user_id)
            
            if user_file.exists():
                user_file.unlink()
                logger.info(f"🗑️  Cleared memory for user {user_id[:8]}...")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error clearing memory: {e}")
            return False


# Global instance
_memory_service = None


def get_memory_service() -> MemoryService:
    """Get or create memory service instance"""
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service
