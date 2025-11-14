"""OpenAI provider implementation."""

import os
from openai import OpenAI
from .base import AIProvider


class OpenAIProvider(AIProvider):
    """OpenAI implementation of the AIProvider interface."""

    def __init__(self, model: str = "gpt-4o"):
        """
        Initialize the OpenAI provider.

        Args:
            model: The OpenAI model to use (default: gpt-4o)

        Raises:
            ValueError: If OPENAI_API_KEY environment variable is not set
        """
        self.model = model
        api_key = os.getenv('OPENAI_API_KEY')

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is not set. "
                "Please set it in your .env file or environment variables."
            )

        self.client = OpenAI(api_key=api_key)

    def process(self, content: str, prompt: str) -> str:
        """
        Process content using OpenAI's API.

        Args:
            content: The text content to process
            prompt: The instruction/prompt for the AI

        Returns:
            The AI-generated response as a string
        """
        full_prompt = f"{prompt}\n\nContent:\n{content}"

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": full_prompt}
            ]
        )

        return response.choices[0].message.content
