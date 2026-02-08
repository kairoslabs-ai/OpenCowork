"""LLM Service for Intelligent Plan Generation

Supports multiple LLM providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic Claude
- Local LLMs via Ollama
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional, Any, Dict, List
import json

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Base class for LLM providers"""

    @abstractmethod
    async def generate_plan(
        self, goal: str, available_tools: List[Dict[str, Any]], context: Optional[Dict] = None
    ) -> str:
        """Generate a plan as JSON string"""
        pass

    @abstractmethod
    async def generate_response(self, prompt: str) -> str:
        """Generate a generic response"""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider"""

    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.api_key = api_key
        self.model = model
        self._validate_api_key()

    def _validate_api_key(self):
        if not self.api_key or not self.api_key.startswith("sk-"):
            logger.warning("Invalid OpenAI API key format")

    async def generate_plan(
        self, goal: str, available_tools: List[Dict[str, Any]], context: Optional[Dict] = None
    ) -> str:
        """Generate plan using OpenAI"""
        try:
            import openai

            openai.api_key = self.api_key

            tools_desc = self._format_tools(available_tools)
            context_str = self._format_context(context)

            prompt = f"""You are an intelligent task planning assistant. Given a user goal and available tools, create a detailed step-by-step plan.

Available Tools:
{tools_desc}

{context_str}

User Goal: {goal}

Return ONLY a valid JSON object with the following structure:
{{
  "goal": "{goal}",
  "steps": [
    {{
      "step": 1,
      "action": "tool_name",
      "description": "what this step does",
      "arguments": {{"key": "value"}}
    }}
  ],
  "summary": "overall plan summary",
  "estimated_tokens": 5000,
  "estimated_duration_min": 10
}}

Ensure steps are logical, sequential, and use only available tools."""

            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000,
            )

            plan_json = response["choices"][0]["message"]["content"]
            return plan_json

        except Exception as e:
            logger.error(f"OpenAI planning error: {e}")
            raise

    async def generate_response(self, prompt: str) -> str:
        """Generic response generation"""
        try:
            import openai

            openai.api_key = self.api_key

            response = await openai.ChatCompletion.acreate(
                model=self.model, messages=[{"role": "user", "content": prompt}], temperature=0.7
            )

            return response["choices"][0]["message"]["content"]

        except Exception as e:
            logger.error(f"OpenAI response error: {e}")
            raise

    def _format_tools(self, tools: List[Dict[str, Any]]) -> str:
        """Format tools for prompt"""
        formatted = []
        for tool in tools:
            formatted.append(
                f"- {tool.get('name', 'unknown')}: {tool.get('description', 'No description')}"
            )
        return "\n".join(formatted)

    def _format_context(self, context: Optional[Dict]) -> str:
        """Format context for prompt"""
        if not context:
            return ""

        parts = []
        if "current_directory" in context:
            parts.append(f"Current directory: {context['current_directory']}")
        if "recent_files" in context:
            parts.append(f"Recent files: {', '.join(context['recent_files'][:5])}")
        if "system_info" in context:
            parts.append(f"System: {context['system_info']}")

        return "\n".join(parts)


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider"""

    def __init__(self, api_key: str, model: str = "claude-3-opus-20240229"):
        self.api_key = api_key
        self.model = model
        self._validate_api_key()

    def _validate_api_key(self):
        if not self.api_key or not self.api_key.startswith("sk-ant-"):
            logger.warning("Invalid Anthropic API key format")

    async def generate_plan(
        self, goal: str, available_tools: List[Dict[str, Any]], context: Optional[Dict] = None
    ) -> str:
        """Generate plan using Claude"""
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=self.api_key)

            tools_desc = self._format_tools(available_tools)
            context_str = self._format_context(context)

            prompt = f"""You are an intelligent task planning assistant. Given a user goal and available tools, create a detailed step-by-step plan.

Available Tools:
{tools_desc}

{context_str}

User Goal: {goal}

Return ONLY a valid JSON object with the following structure:
{{
  "goal": "{goal}",
  "steps": [
    {{
      "step": 1,
      "action": "tool_name",
      "description": "what this step does",
      "arguments": {{"key": "value"}}
    }}
  ],
  "summary": "overall plan summary",
  "estimated_tokens": 5000,
  "estimated_duration_min": 10
}}

Ensure steps are logical, sequential, and use only available tools."""

            message = await client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )

            return message.content[0].text

        except Exception as e:
            logger.error(f"Anthropic planning error: {e}")
            raise

    async def generate_response(self, prompt: str) -> str:
        """Generic response generation"""
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=self.api_key)

            message = await client.messages.create(
                model=self.model, max_tokens=1000, messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text

        except Exception as e:
            logger.error(f"Anthropic response error: {e}")
            raise

    def _format_tools(self, tools: List[Dict[str, Any]]) -> str:
        """Format tools for prompt"""
        formatted = []
        for tool in tools:
            formatted.append(
                f"- {tool.get('name', 'unknown')}: {tool.get('description', 'No description')}"
            )
        return "\n".join(formatted)

    def _format_context(self, context: Optional[Dict]) -> str:
        """Format context for prompt"""
        if not context:
            return ""

        parts = []
        if "current_directory" in context:
            parts.append(f"Current directory: {context['current_directory']}")
        if "recent_files" in context:
            parts.append(f"Recent files: {', '.join(context['recent_files'][:5])}")
        if "system_info" in context:
            parts.append(f"System: {context['system_info']}")

        return "\n".join(parts)


class OllamaProvider(LLMProvider):
    """Local LLM via Ollama"""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "mistral"):
        self.base_url = base_url
        self.model = model

    async def generate_plan(
        self, goal: str, available_tools: List[Dict[str, Any]], context: Optional[Dict] = None
    ) -> str:
        """Generate plan using Ollama"""
        try:
            import httpx

            tools_desc = self._format_tools(available_tools)
            context_str = self._format_context(context)

            prompt = f"""You are an intelligent task planning assistant. Given a user goal and available tools, create a detailed step-by-step plan.

Available Tools:
{tools_desc}

{context_str}

User Goal: {goal}

Return ONLY a valid JSON object with this structure:
{{
  "goal": "{goal}",
  "steps": [
    {{"step": 1, "action": "tool_name", "description": "description", "arguments": {{}}}}
  ],
  "summary": "summary",
  "estimated_tokens": 5000,
  "estimated_duration_min": 10
}}"""

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": prompt, "stream": False},
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "")

            logger.error("Ollama generation failed")
            return ""

        except Exception as e:
            logger.error(f"Ollama planning error: {e}")
            raise

    async def generate_response(self, prompt: str) -> str:
        """Generic response generation"""
        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": prompt, "stream": False},
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "")

            return ""

        except Exception as e:
            logger.error(f"Ollama response error: {e}")
            raise

    def _format_tools(self, tools: List[Dict[str, Any]]) -> str:
        """Format tools for prompt"""
        formatted = []
        for tool in tools:
            formatted.append(
                f"- {tool.get('name', 'unknown')}: {tool.get('description', 'No description')}"
            )
        return "\n".join(formatted)

    def _format_context(self, context: Optional[Dict]) -> str:
        """Format context for prompt"""
        if not context:
            return ""

        parts = []
        if "current_directory" in context:
            parts.append(f"Current directory: {context['current_directory']}")
        if "recent_files" in context:
            parts.append(f"Recent files: {', '.join(context['recent_files'][:5])}")

        return "\n".join(parts)


class LLMService:
    """Main LLM service with provider abstraction"""

    def __init__(self, provider_type: str = "openai", **provider_config):
        self.provider = self._create_provider(provider_type, provider_config)

    def _create_provider(self, provider_type: str, config: Dict[str, Any]) -> LLMProvider:
        """Factory method to create provider"""
        provider_type = provider_type.lower()

        if provider_type == "openai":
            return OpenAIProvider(
                api_key=config.get("api_key", ""),
                model=config.get("model", "gpt-4"),
            )
        elif provider_type == "anthropic":
            return AnthropicProvider(
                api_key=config.get("api_key", ""),
                model=config.get("model", "claude-3-opus-20240229"),
            )
        elif provider_type == "ollama":
            return OllamaProvider(
                base_url=config.get("base_url", "http://localhost:11434"),
                model=config.get("model", "mistral"),
            )
        else:
            raise ValueError(f"Unknown provider: {provider_type}")

    async def generate_plan(
        self, goal: str, available_tools: List[Dict[str, Any]], context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate a plan for a goal"""
        try:
            plan_json = await self.provider.generate_plan(goal, available_tools, context)

            # Parse JSON response
            plan_data = json.loads(plan_json)
            return plan_data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            raise ValueError("LLM response was not valid JSON")
        except Exception as e:
            logger.error(f"Plan generation error: {e}")
            raise

    async def generate_response(self, prompt: str) -> str:
        """Generate a generic response"""
        return await self.provider.generate_response(prompt)
