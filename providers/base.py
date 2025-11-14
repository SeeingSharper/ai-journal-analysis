"""Base interface for AI providers."""

from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    def process(self, content: str, prompt: str) -> str:
        """
        Process content with the AI model using the given prompt.

        Args:
            content: The text content to process
            prompt: The instruction/prompt for the AI

        Returns:
            The AI-generated response as a string
        """
        pass
