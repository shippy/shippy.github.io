---
title: "Langfuse, Instructor & FastAPI: Prompt Management Workflow"
description: "Quick practitioner's notes on actual usage."
pubDate: 2024-07-19
categories:
  - "llms"
heroImage: ./images/three-sources-interacting.png
draft: true
---

A recent LLM project required a locally-hosted solution for tracing and prompt management. I've been eyeing [Langfuse](https://langfuse.com/), which integrates low-level tracing (á la [LangSmith](https://docs.smith.langchain.com/tracing/faq/logging_and_viewing), [Logfire](https://logfire.pydantic.dev) or [LangTail](https://langtail.com)) with prompt management and a usage dashboard (as well as other features) - but you can deploy it on your own infrastructure without paying up the wazoo.

Two straightforward usage issues came up in the process: how to patch OpenAI Chat Completions endpoint with multiple OpenAI-patching libraries, and how to set up a prompt management workflow. Since I couldn't find any write-up online or related messages on the many associated Discord servers, I'm noting my solution here.

## Automated Langfuse instrumentation vs. Instructor

A *lot* of libraries accomplish their functionality by plugging into the official OpenAI Python SDK. If you want observability *and* functionality, you have to combine them. How?

Well, one at a time, and you hope they don't do anything to break compatibility in the future.

```python
from instructor import AsyncInstructor, from_openai
from langfuse.openai import AsyncOpenAI


def get_instructor_client(api_key: str | None = None) -> AsyncInstructor:
    """Get an OpenAI-compatible client."""
    raw_client = AsyncOpenAI(api_key=api_key)
    client = from_openai(raw_client)
    return client  # type: ignore  # noqa: PGH003
```

The last line gives `mypy` the heebie-jeebies for no clear reason - if the initial import is `from openai import AsyncOpenAI`, everything is typed as intended, and `langfuse.openai.AsyncOpenAI` doesn't seem to be typed differently - but the solution works like a charm.

(I don't want to think too hard about throwing LiteLLM, OpenRouter or RouteLLM into the mix, though.)

## Prompt management: chicken/egg problem

If setting up Langfuse isn't the first thing you've done in your LLM project, you probably have existing API calls using hard-coded prompts. At this point, you face the choice: do I manually transfer the prompt to the Langfuse UI, or do I run a single-purpose script that sets up the prompts in Langfuse? And if the latter, at what point in the lifecycle of the app do I re-run this script? And how do I make sure this doesn't create new prompt versions in vain, [since Langfuse prompt creation is not yet idempotent](https://github.com/orgs/langfuse/discussions/2161)?

The solution I came to uses a Python workflow: assume the prompt exists in Langflow and if not, create its first version. Afterwards, continue iterating on the prompt in the Langflow UI.

The following excerpt loads - and, upon failure, defines - an `chat-extract-feedback` chat prompt. After the load/create step, everything proceeds normally.

(In this case, this is part of a fictional application named Weathervane, which defines Pydantic models of input and output in `weathervane.models`. [See here for an introduction to Pydantic/Instructor.](https://github.com/jxnl/instructor))

```python
from instructor import AsyncInstructor
from langfuse import Langfuse
from langfuse.api.resources.commons.errors.not_found_error import NotFoundError

from weathervane.models.email import IncomingChat
from weathervane.models.output import ExtractedFeedback

async def llm_extract_feedback_from_chat(client: AsyncInstructor, chat: IncomingChat) -> ExtractedFeedback:
    """Extract feedback from a chat message via LLM call."""
    langfuse = Langfuse()

    try:
        prompt = langfuse.get_prompt("chat-extract-feedback", type="chat", label="production")
    except NotFoundError:
        prompt = langfuse.create_prompt(
            name="chat-extract-feedback",
            prompt=[
                {"role": "system", "content": "Extract feedback information from the chat message."},
                {"role": "user", "content": "{{chat_json}}"},
            ],
            config={
                "model": "gpt-4o",
                # "response_model": ExtractedFeedback,
            },
            type="chat",
            labels=["production"],
        )

    compiled_prompt = prompt.compile(chat_json=chat.model_dump_json())

    return await client.chat.completions.create(
        response_model=ExtractedFeedback,  # kwarg added by Instructor
        messages=compiled_prompt,
        langfuse_prompt=prompt,  # keeps the version in Generations
        **prompt.config,
    )
```

(The only exception to the normality of this is that Langfuse currently cannot version Instructor/Pydantic models passed in `response_model`, or at least their schemas. This is unfortunate, since the response schema is an essential part of the prompt, but can be worked around.)

## Notes on `@observe` and FastAPI

This works:

```python
@router.post("/chat")
@observe()
async def extract_feedback_from_chat(
    email: IncomingChat, client: Annotated[AsyncInstructor, Depends(get_instructor_client)]
) -> ExtractedFeedback:
    """Extract feedback from a chat."""
    # Group the following traces by session
    langfuse_context.update_current_observation(session_id=str(uuid4()))
```

This doesn't:

```python
@observe()
@router.post("/chat")
async def extract_payment_info_from_chat(...) -> ...:
```

Neither order breaks FastAPI, but the latter breaks Langfuse.

## Conclusion

Self-hosted Langfuse is still not the elusive all-in-one solution