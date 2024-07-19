---
title: "Multi-agent chats as the Step Beyond ChatGPT"
description: "A reflection on the process of creating multi-agent workflows with Autogen."
date: 2024-04-15
categories:
  - "llms"
image: ./images/agents_interacting.png
author: "Simon Podhajsky"
---

This Easter weekend, I forbade myself from working. I half-succeeded: although I made two [AutoGen](https://github.com/microsoft/autogen) projects, none were for my day job! **#soproud** Here goes: [a cover letter generator](https://github.com/shippy/cover_letter_automation) and a multi-provider therapy session. (A friend needed both and I thought it would be a good distraction for us to convert a human problem into a technical problem. Because that's healthy.)

But first, what is AutoGen?

## A quick introduction to AutoGen

AutoGen lets you write **agents**, which is a fancy word for "LLM prompts with tool access and execution environment". Furthermore, it lets you compose said agents into **multi-agent workflows**, which allow the agents to respond to each other based on the conversation history and each agent's prompt.

This is useful to you if you often go back-and-forth with ChatGPT to iterate towards a final result in a way that could be taught to a set of interns. This is basically a way to let the machine take your turn in the conversation and "steer the ship" towards a goal you've set out for it.

AutoGen does this programmatically in Python, but the maintainers also released [a GUI named "Autogen Studio"](https://autogen-studio.com), which is a little more user-friendly. The remainder of this article will focus on the Python side of things, though.

## Back to the projects

The concept behind each project was simple:

1. Set up a Poetry environment (ideally from a [Copier template](https://github.com/lukin0110/poetry-copier/) that makes the environment immediately pip-installable) and install `pyautogen`.
2. Create a `UserProxyAgent` as a stand-in for the user. _While by default, the `UserProxyAgent` prompts for human input every time it's invoked, it does not **need** to, and you can use it just to simulate the opening of the conversation._
3. Break down the big task into subtasks, ideally with a clear input, output, and instruction set.
4. Create one agent per subtask, with a clear set of instructions, output requirements, _and_ who to pass the baton to under what circumstances.
5. **If applicable:** Create a set of "allowable speaker transitions", i.e. which agent can speak after this agent is done, and set up the `GroupChat`.
6. Create a CLI script that will invoke the setup with the right environment variables and flexible input parameters.

([I should really make a Copier template for this.](https://www.linkedin.com/feed/update/urn:li:activity:7176339756262277120/) Of course, it's a little complicated by the fact that the nature, prompt and setup of each agent is a little different each time, but there's sufficient similarity that it might be worth it.)

I want to talk about the cool parts of the process.

### Custom prompting

I think this is the most important part of the process to get right, especially when making a multi-agent process for a highly personalized activity like therapy or job applications. Of course, [you should follow the best practices for prompt engineering](https://platform.openai.com/docs/guides/prompt-engineering), but **if this is a task you already have some experience in, you should strive to make the secret sauce explicit**.

To take the example of the cover letter writing:

- In the age of the RLHF, most ChatGPT prose sounds the same; I wanted to make sure the cover letter was different. (Yes, I notice the irony.) So I gave the Critic agent a prompt that asked it to check for the presence of an authentic voice, and the Writer agent a permission to engage in _a little whimsy_ if requested. (Tuning it to just the right anount of whimsy was a little tricky, of course. I got a lot of wacky cover letters during the testing.)
- I also wanted to make sure that the cover letter was _good_, so I asked the Critic to check for clear sentence structure, paragraph progression, veracity to the resume excerpts, and a few other things I like to have in my writing.

Or, of course - I know the kind of therapy I like, and my friend knew what kind of therapy he prefers. So we could made the prompts specific to our needs. This is a challenge in putting the prompts out there, in fact - both the cover-letter and the therapy session requirements can get a little too personal.

### Agent transitions on the happy path and away from it

This is the trickiest part to me, as the definition of finite-state machine transitions is the same for both success and failure - which means it needs to permit for both, confusing either.

- **On success**, it's very easy to define the next agent to speak. In the cover letter example, the Critic agent would pass the baton to the Writer agent if the cover letter was good enough. In the therapy session, the UserProxyAgent would pass the baton to any Therapist agent if the user indicated that they were ready to move on.
- **On failure**, however, things become less clear. If a single-use agent fails, especially if they fail on a tool invocation, it's difficult to define the next agent to speak. But this is, in part because it's **difficult to define what failure is**. Let's use a couple of examples, in decreasing order of clarity:
  - In the cover letter example, the Job Description Ingester agent could miss an important detail for the cover letter submission (e.g. the company name or the requirement that the hiring agent be addressed by Mr. Banana lest they fail the candidate for not reading the JD closely enough).
  - Still in the cover letter example, the Critic agent could fail if they had no more criticism to give, didn't call the function to save the cover letter to the target folder, but still terminated the workflow.
  - Finally, in the cover letter example, the Critic agent could fail if the cover letter was not good enough, yet it didn't pick up on it. But what does "not good enough" mean? Some of that can be defined in structural terms (e.g. no intro), but some of it is inevitably subjective.
  - Finally, one of the therapy agents could provide bad advice - but what does "bad" therapeutic advice even mean, short of actively instigating harm to self or others?

### From vibes to [DeepEval](https://docs.confident-ai.com/docs/getting-started) evals

This was probably the toughest. Two reasons here: (1) developing evals themselves is difficult, and (2) the cost of running the evals is high, so you don't want to run them too often, which means you don't get as much feedback as you'd like as often as you'd need.

(This is where Small Language Models could shine, in theory! But then you have to adapt the prompts to different models, and that's a whole other can of worms.)

### State maintenance

This doesn't have a good answer yet, even though it's a problem that's been solved many times over. The `Teachability` feature is a sort-of too-smart solution to a different problem, which is that agents don't remember dynamically what you told them - but what you often want is a fully detereministic key-value store. Well, guess what - fully deterministic key-value stores are not exactly uncommon in the tech space! But Autogen doesn't support any of them out-of-the-box, so there's a wide space of custom implementations.

### Observability

By default, there isn't much - on a run that completes gracefully, you get an object with `.chat_history`, otherwise you get a traceback. There's _some_ default instrumentation, but none that appears easily extensible.

### Cost

Each run cost between $0.05 and $0.50, depending on the length of the conversation, using `gpt-4-turbo-preview`. This is a _little_ expensive - I still wouldn't hesitate to use it for a personal use case, but would likely balk at providing it as a free service to the general public. (Unless it's "bring your own API key", I suppose.)

## Conclusion

Multi-agent workflows impress me. In specific use cases, they're a clear step above bare GPT-4 prompting - and even though they're not a panacea, the list of shortcomings is highly tractable. I'm looking forward to shortening it.
