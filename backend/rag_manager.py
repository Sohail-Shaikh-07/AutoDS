import os
import chromadb
from chromadb.utils import embedding_functions
from openai import AsyncOpenAI
from typing import List, Dict, Any
import uuid


class RAGManager:
    def __init__(self):
        # Initialize ChromaDB (Persistent or Ephemeral)
        # We use a local persistent path so data survives restarts if needed,
        # but for now we might want to clear it on session start.
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(base_dir, "cache", "chroma_db")
        os.makedirs(self.db_path, exist_ok=True)

        self.client = chromadb.PersistentClient(path=self.db_path)

        # Create or get collection
        # We use a single collection but filter by session_id
        self.collection = self.client.get_or_create_collection(name="autods_context")

        # DeepInfra Client for Embeddings
        api_key = os.getenv("DEEPINFRA_API_KEY")
        self.aclient = AsyncOpenAI(
            api_key=api_key or "missing_key",
            base_url="https://api.deepinfra.com/v1/openai",
        )
        self.model_name = "Qwen/Qwen3-Embedding-4B-batch"  # User requested model

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding using DeepInfra."""
        try:
            response = await self.aclient.embeddings.create(
                model=self.model_name, input=text, encoding_format="float"
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Embedding Error: {e}")
            return []

    async def add_document(self, text: str, metadata: Dict[str, Any]):
        """Embeds and adds a document to ChromaDB."""
        embedding = await self.embed_text(text)
        if not embedding:
            return

        self.collection.add(
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata],
            ids=[str(uuid.uuid4())],
        )

    async def query(
        self, query_text: str, session_id: str, n_results: int = 3
    ) -> List[str]:
        """Queries the vector store for relevant context."""
        embedding = await self.embed_text(query_text)
        if not embedding:
            return []

        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            where={"session_id": session_id},  # Filter by session
        )

        # Flatten results (list of lists)
        if results["documents"]:
            return results["documents"][0]
        return []

    def clear_session(self, session_id: str):
        """Removes documents for a specific session."""
        try:
            self.collection.delete(where={"session_id": session_id})
        except Exception:
            pass
