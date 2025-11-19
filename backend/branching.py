"""
Conversation Branching Service
Allows users to create "What if?" alternate conversation paths
"""
import logging
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)

BRANCH_STORAGE_DIR = Path("branch_storage")
BRANCH_STORAGE_DIR.mkdir(exist_ok=True)


class BranchingService:
    """Manages conversation branches and alternate paths"""
    
    def __init__(self):
        logger.info("🌳 Branching Service initialized")
    
    def _get_branch_file(self, conversation_id: str) -> Path:
        """Get the file path for a conversation's branches"""
        # Hash conversation ID for filename
        conv_hash = hashlib.md5(conversation_id.encode()).hexdigest()
        return BRANCH_STORAGE_DIR / f"branches_{conv_hash}.json"
    
    def _load_branches(self, conversation_id: str) -> Dict:
        """Load branch data for a conversation"""
        branch_file = self._get_branch_file(conversation_id)
        
        if not branch_file.exists():
            return {
                "conversation_id": conversation_id,
                "branches": {},
                "created_at": datetime.now().isoformat()
            }
        
        try:
            with open(branch_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading branches: {e}")
            return {
                "conversation_id": conversation_id,
                "branches": {},
                "created_at": datetime.now().isoformat()
            }
    
    def _save_branches(self, conversation_id: str, data: Dict):
        """Save branch data"""
        branch_file = self._get_branch_file(conversation_id)
        data["updated_at"] = datetime.now().isoformat()
        
        try:
            with open(branch_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving branches: {e}")
    
    def create_branch(
        self,
        conversation_id: str,
        parent_message_id: str,
        branch_name: Optional[str] = None,
        branch_context: Optional[str] = None
    ) -> str:
        """
        Create a new branch from a specific message
        
        Args:
            conversation_id: The conversation to branch
            parent_message_id: ID of message to branch from
            branch_name: Optional name for the branch
            branch_context: Optional context about why branching
        
        Returns:
            branch_id: Unique ID for the new branch
        """
        data = self._load_branches(conversation_id)
        
        # Generate branch ID
        branch_id = f"branch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create branch metadata
        branch = {
            "branch_id": branch_id,
            "parent_message_id": parent_message_id,
            "branch_name": branch_name or f"Branch from message {parent_message_id[:8]}",
            "branch_context": branch_context,
            "created_at": datetime.now().isoformat(),
            "messages": [],  # Will store messages in this branch
            "is_active": False
        }
        
        data["branches"][branch_id] = branch
        self._save_branches(conversation_id, data)
        
        logger.info(f"Created branch {branch_id} from message {parent_message_id}")
        return branch_id
    
    def get_branches(self, conversation_id: str) -> List[Dict]:
        """Get all branches for a conversation"""
        data = self._load_branches(conversation_id)
        return list(data["branches"].values())
    
    def get_branch(self, conversation_id: str, branch_id: str) -> Optional[Dict]:
        """Get a specific branch"""
        data = self._load_branches(conversation_id)
        return data["branches"].get(branch_id)
    
    def add_message_to_branch(
        self,
        conversation_id: str,
        branch_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ):
        """Add a message to a branch"""
        data = self._load_branches(conversation_id)
        
        if branch_id not in data["branches"]:
            raise ValueError(f"Branch {branch_id} not found")
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        data["branches"][branch_id]["messages"].append(message)
        self._save_branches(conversation_id, data)
    
    def set_active_branch(self, conversation_id: str, branch_id: Optional[str]):
        """Set which branch is currently active"""
        data = self._load_branches(conversation_id)
        
        # Mark all branches as inactive
        for branch in data["branches"].values():
            branch["is_active"] = False
        
        # Mark specified branch as active
        if branch_id and branch_id in data["branches"]:
            data["branches"][branch_id]["is_active"] = True
        
        self._save_branches(conversation_id, data)
    
    def get_active_branch(self, conversation_id: str) -> Optional[Dict]:
        """Get the currently active branch"""
        data = self._load_branches(conversation_id)
        
        for branch in data["branches"].values():
            if branch.get("is_active", False):
                return branch
        
        return None
    
    def get_branch_history(
        self,
        conversation_id: str,
        branch_id: str,
        include_parent: bool = True
    ) -> List[Dict]:
        """
        Get full conversation history up to and including a branch
        
        Args:
            conversation_id: The conversation ID
            branch_id: The branch to get history for
            include_parent: Whether to include parent conversation messages
        
        Returns:
            List of messages in chronological order
        """
        data = self._load_branches(conversation_id)
        
        if branch_id not in data["branches"]:
            return []
        
        branch = data["branches"][branch_id]
        messages = []
        
        if include_parent:
            # Load parent conversation up to parent_message_id
            try:
                from memory import get_memory_service
                
                memory_service = get_memory_service()
                parent_msg_id = branch["parent_message_id"]
                
                # Get conversation history up to the parent message
                parent_history = memory_service.get_conversation_until_message(
                    user_id=conversation_id,
                    message_id=parent_msg_id
                )
                
                messages.extend(parent_history)
                logger.info(f"Loaded {len(parent_history)} parent messages for branch {branch_id}")
            
            except Exception as e:
                logger.error(f"Error loading parent conversation: {e}")
                # Continue without parent history if there's an error
        
        # Add branch messages
        branch_messages = branch["messages"]
        messages.extend(branch_messages)
        
        logger.info(f"Total branch history: {len(messages)} messages ({len(branch_messages)} in branch)")
        return messages
    
    def delete_branch(self, conversation_id: str, branch_id: str):
        """Delete a branch"""
        data = self._load_branches(conversation_id)
        
        if branch_id in data["branches"]:
            del data["branches"][branch_id]
            self._save_branches(conversation_id, data)
            logger.info(f"Deleted branch {branch_id}")
    
    def get_branch_tree(self, conversation_id: str) -> Dict:
        """
        Get visual representation of branch structure
        
        Returns:
            Tree structure showing all branches and their relationships
        """
        data = self._load_branches(conversation_id)
        
        tree = {
            "conversation_id": conversation_id,
            "main_conversation": {
                "id": "main",
                "name": "Main Conversation",
                "is_active": not any(b.get("is_active") for b in data["branches"].values())
            },
            "branches": []
        }
        
        for branch in data["branches"].values():
            tree["branches"].append({
                "branch_id": branch["branch_id"],
                "branch_name": branch["branch_name"],
                "parent_message_id": branch["parent_message_id"],
                "message_count": len(branch["messages"]),
                "is_active": branch.get("is_active", False),
                "created_at": branch["created_at"]
            })
        
        return tree


# Global instance
_branching_service = None


def get_branching_service() -> BranchingService:
    """Get or create branching service instance"""
    global _branching_service
    if _branching_service is None:
        _branching_service = BranchingService()
    return _branching_service
