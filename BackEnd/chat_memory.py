"""
Chat Memory Manager for TutorApp
Manages chat threads and message history using ChromaDB cloud storage.
"""

import uuid
from datetime import datetime
from typing import List, Dict, Optional
from .chromaConnection import get_chroma_client


class ChatMemoryManager:
    """
    Manages chat threads and conversation history in ChromaDB.
    Each thread represents a separate conversation with persistent message history.
    """

    COLLECTION_NAME = "chat_history"

    def __init__(self):
        """Initialize the ChatMemoryManager with ChromaDB connection."""
        self.client = get_chroma_client()
        self.collection = self._get_or_create_collection()

    def _get_or_create_collection(self):
        """
        Get or create the chat_history collection in ChromaDB.
        Uses cosine similarity for potential future semantic search on chat history.
        """
        try:
            collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            return collection
        except Exception as e:
            raise RuntimeError(f"Failed to initialize chat_history collection: {str(e)}")

    def create_thread(self, session_id: Optional[str] = None) -> str:
        """
        Create a new chat thread.

        Args:
            session_id: Optional session identifier for grouping threads by user/session

        Returns:
            thread_id: Unique identifier for the new thread
        """
        thread_id = f"thread_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow().isoformat()

        # Add initial metadata document to mark thread creation
        self.collection.add(
            documents=[f"Thread created"],
            metadatas=[{
                "thread_id": thread_id,
                "role": "system",
                "timestamp": timestamp,
                "session_id": session_id or "default",
                "message_type": "thread_start"
            }],
            ids=[f"{thread_id}-start"]
        )

        return thread_id

    def add_message(self, thread_id: str, role: str, content: str, session_id: Optional[str] = None) -> str:
        """
        Add a message to a chat thread.

        Args:
            thread_id: The thread to add the message to
            role: Either "user" or "assistant"
            content: The message content
            session_id: Optional session identifier

        Returns:
            message_id: Unique identifier for the added message
        """
        if role not in ["user", "assistant"]:
            raise ValueError(f"Invalid role: {role}. Must be 'user' or 'assistant'")

        timestamp = datetime.utcnow().isoformat()

        # Get current message count for this thread to generate sequential IDs
        existing = self.collection.get(
            where={"thread_id": thread_id}
        )
        message_index = len(existing['ids'])

        message_id = f"{thread_id}-msg-{message_index}"

        self.collection.add(
            documents=[content],
            metadatas=[{
                "thread_id": thread_id,
                "role": role,
                "timestamp": timestamp,
                "session_id": session_id or "default",
                "message_type": "message",
                "message_index": message_index
            }],
            ids=[message_id]
        )

        return message_id

    def get_thread_history(self, thread_id: str, limit: Optional[int] = None) -> List[Dict]:
        """
        Retrieve all messages in a chat thread, ordered by timestamp.

        Args:
            thread_id: The thread to retrieve
            limit: Optional limit on number of messages to return (most recent)

        Returns:
            List of message dictionaries with keys: id, role, content, timestamp
        """
        results = self.collection.get(
            where={"thread_id": thread_id}
        )

        if not results['ids']:
            return []

        # Combine results into message dictionaries
        messages = []
        for i in range(len(results['ids'])):
            metadata = results['metadatas'][i]

            # Skip system messages (thread_start)
            if metadata.get('message_type') == 'thread_start':
                continue

            messages.append({
                'id': results['ids'][i],
                'role': metadata['role'],
                'content': results['documents'][i],
                'timestamp': metadata['timestamp'],
                'message_index': metadata.get('message_index', 0)
            })

        # Sort by message_index to ensure correct order
        messages.sort(key=lambda x: x['message_index'])

        # Apply limit if specified (return most recent)
        if limit and limit < len(messages):
            messages = messages[-limit:]

        return messages

    def list_threads(self, session_id: Optional[str] = None) -> List[Dict]:
        """
        List all chat threads, optionally filtered by session.

        Args:
            session_id: Optional session filter

        Returns:
            List of thread info dictionaries with keys: thread_id, created_at, message_count
        """
        # Get all thread start markers
        if session_id:
            where_clause = {
                "$and": [
                    {"message_type": "thread_start"},
                    {"session_id": session_id}
                ]
            }
        else:
            where_clause = {"message_type": "thread_start"}

        results = self.collection.get(where=where_clause)

        if not results['ids']:
            return []

        threads = []
        for i in range(len(results['ids'])):
            metadata = results['metadatas'][i]
            thread_id = metadata['thread_id']

            # Get message count for this thread (using $and for multiple conditions)
            thread_messages = self.collection.get(
                where={
                    "$and": [
                        {"thread_id": thread_id},
                        {"message_type": "message"}
                    ]
                }
            )

            # Get first user message as preview
            preview = "New chat"
            if thread_messages['ids']:
                for j, msg_meta in enumerate(thread_messages['metadatas']):
                    if msg_meta['role'] == 'user':
                        preview = thread_messages['documents'][j][:50] + "..." if len(thread_messages['documents'][j]) > 50 else thread_messages['documents'][j]
                        break

            threads.append({
                'thread_id': thread_id,
                'created_at': metadata['timestamp'],
                'message_count': len(thread_messages['ids']),
                'preview': preview
            })

        # Sort by creation time (most recent first)
        threads.sort(key=lambda x: x['created_at'], reverse=True)

        return threads

    def delete_thread(self, thread_id: str) -> bool:
        """
        Delete a chat thread and all its messages.

        Args:
            thread_id: The thread to delete

        Returns:
            True if deletion was successful
        """
        try:
            # Get all message IDs for this thread
            results = self.collection.get(
                where={"thread_id": thread_id}
            )

            if not results['ids']:
                return False

            # Delete all messages
            self.collection.delete(ids=results['ids'])

            return True
        except Exception as e:
            raise RuntimeError(f"Failed to delete thread {thread_id}: {str(e)}")

    def get_recent_context(self, thread_id: str, max_messages: int = 10) -> str:
        """
        Get recent conversation context as a formatted string for AI prompting.

        Args:
            thread_id: The thread to get context from
            max_messages: Maximum number of recent messages to include

        Returns:
            Formatted conversation history string
        """
        messages = self.get_thread_history(thread_id, limit=max_messages)

        if not messages:
            return ""

        context_parts = []
        for msg in messages:
            role_label = "User" if msg['role'] == 'user' else "Assistant"
            context_parts.append(f"{role_label}: {msg['content']}")

        return "\n\n".join(context_parts)
