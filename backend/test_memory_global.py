"""Tests for global memory indexing and retrieval
"""
from backend.memory import get_memory_service


def test_global_index_and_retrieve():
    svc = get_memory_service()
    # Ensure global memory enabled in config
    # Save messages from two different users about 'antartica' (typo) and 'Antarctica'
    svc.save_message('user_a', 'user', 'I love the wildlife in Antarctica. Penguins are cool!')
    svc.save_message('user_b', 'user', 'Tell me more about Antarctica and the penguins.')
    # Query with a related question
    results = svc.retrieve_related_memory('What can you tell me about penguins in Antarctica?', limit=3)
    assert len(results) >= 1
    # Check that top result contains 'Antarctica' or 'penguins'
    top = results[0]['content'].lower()
    assert 'antarctica' in top or 'penguins' in top
