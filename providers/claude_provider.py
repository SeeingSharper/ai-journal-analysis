"""Claude (Anthropic) provider implementation."""

import os
from anthropic import Anthropic
from .base import AIProvider


class ClaudeProvider(AIProvider):
    """Claude/Anthropic implementation of the AIProvider interface."""

    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        """
        Initialize the Claude provider.

        Args:
            model: The Claude model to use (default: claude-sonnet-4-20250514)

        Raises:
            ValueError: If ANTHROPIC_API_KEY environment variable is not set
        """
        self.model = model
        api_key = os.getenv('ANTHROPIC_API_KEY')

        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY environment variable is not set. "
                "Please set it in your .env file or environment variables."
            )

        self.client = Anthropic(api_key=api_key)

    def process(self, content: str, prompt: str) -> str:
        """
        Process content using Anthropic's Claude API.

        Args:
            content: The text content to process
            prompt: The instruction/prompt for the AI

        Returns:
            The AI-generated response as a string
        """
        full_prompt = f"{prompt}\n\nContent:\n{content}"

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": full_prompt}
            ]
        )

        return response.content[0].text
