"""Agent tool framework for orchestrating LLM tool calls."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple


@dataclass
class AgentTool:
    """Simple container describing a callable tool exposed to the LLM."""

    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Callable[[Dict[str, Any]], Dict[str, Any]]

    def schema(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }

    def __call__(self, *, arguments: Dict[str, Any]) -> Dict[str, Any]:
        return self.handler(arguments)


class AgentExecutionError(RuntimeError):
    pass


def run_agentic_session(
    openai_client,
    *,
    model: str,
    messages: List[Dict[str, Any]],
    tools: List[AgentTool],
    temperature: float = 0.2,
    max_iterations: int = 6,
) -> Tuple[str, List[Dict[str, Any]]]:
    """Execute an agent loop with function-calling tools.

    Returns the final assistant content and the list of tool interactions.
    """

    if not tools:
        raise ValueError("Agent session requires at least one tool.")

    tool_lookup = {tool.name: tool for tool in tools}
    functions = [tool.schema() for tool in tools]
    tool_events: List[Dict[str, Any]] = []

    for iteration in range(max_iterations):
        response = openai_client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=messages,
            functions=functions,
            function_call="auto",
        )
        choice = response.choices[0].message
        if choice.function_call:
            tool_name = choice.function_call.name
            tool = tool_lookup.get(tool_name)
            if not tool:
                raise AgentExecutionError(f"LLM requested unknown tool '{tool_name}'")
            try:
                arguments = json.loads(choice.function_call.arguments or "{}")
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive
                raise AgentExecutionError(
                    f"Invalid JSON arguments for tool '{tool_name}': {exc}"
                ) from exc

            result = tool(arguments=arguments)
            tool_events.append({
                "iteration": iteration,
                "tool": tool_name,
                "arguments": arguments,
                "result": result,
            })
            messages.append({
                "role": "assistant",
                "content": None,
                "function_call": {
                    "name": tool_name,
                    "arguments": json.dumps(arguments, ensure_ascii=False),
                },
            })
            messages.append({
                "role": "function",
                "name": tool_name,
                "content": json.dumps(result, ensure_ascii=False),
            })
            continue

        final_text = choice.content or ""
        messages.append({"role": "assistant", "content": final_text})
        return final_text, tool_events

    raise AgentExecutionError("Agent loop exceeded maximum iterations without a final answer.")
