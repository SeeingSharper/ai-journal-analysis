"""Factory for creating AI providers based on model name."""

from .base import AIProvider
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider


def create_provider(model: str) -> AIProvider:
    """
    Create an AI provider based on the model name.

    Args:
        model: The model name (e.g., 'gpt-4o', 'claude-sonnet-4-20250514')

    Returns:
        An instance of AIProvider (either OpenAIProvider or ClaudeProvider)

    Raises:
        ValueError: If the model name doesn't match any known provider
    """
    model_lower = model.lower()

    # Check if it's a Claude model
    if model_lower.startswith('claude'):
        return ClaudeProvider(model=model)

    # Check if it's an OpenAI model
    if model_lower.startswith('gpt') or model_lower.startswith('o1') or model_lower.startswith('o3'):
        return OpenAIProvider(model=model)

    # Default to OpenAI for backward compatibility
    raise ValueError(
        f"Unknown model '{model}'. Model name must start with 'gpt', 'o1', 'o3' (OpenAI) "
        f"or 'claude' (Anthropic)"
    )
