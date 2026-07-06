"""
Kognit Backend — pgvector Embedding Helpers

Provides utility functions for storing and querying
conversation embeddings using pgvector's cosine similarity.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SocraticExchange


async def store_exchange_embedding(
    session: AsyncSession,
    exchange_id: uuid.UUID,
    embedding: list[float],
) -> None:
    """Update an exchange record with its computed embedding vector."""
    exchange = await session.get(SocraticExchange, exchange_id)
    if exchange:
        exchange.embedding = embedding
        await session.flush()


async def find_similar_exchanges(
    session: AsyncSession,
    embedding: list[float],
    session_id: uuid.UUID | None = None,
    top_k: int = 5,
) -> list[SocraticExchange]:
    """
    Find the most semantically similar past exchanges using
    pgvector's cosine distance operator (<=>).

    Optionally scoped to a specific coding session.
    """
    # Build the query — pgvector cosine distance: lower = more similar
    query = (
        select(SocraticExchange)
        .where(SocraticExchange.embedding.isnot(None))
        .order_by(SocraticExchange.embedding.cosine_distance(embedding))
        .limit(top_k)
    )

    if session_id is not None:
        query = query.where(SocraticExchange.session_id == session_id)

    result = await session.execute(query)
    return list(result.scalars().all())


async def ensure_pgvector_extension(session: AsyncSession) -> None:
    """Create the pgvector extension if it doesn't exist."""
    await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    await session.commit()
