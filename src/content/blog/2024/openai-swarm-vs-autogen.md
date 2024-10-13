---
title: "OpenAI's Swarm vs. AutoGen: A Quick Comparison"
description: "Swarm's simplicity is the point, but AutoGen's flexibility is the draw."
date: 2024-10-13
categories:
  - "llms"
image: ./images/swarm-vs-autogen.png
---

**tl;dr:** AutoGen wins, but [see the summary table](#summary-table).

Before all else, an admission that this is a little silly - OpenAI's freshly released [Swarm](https://github.com/openai/swarm) is a fresh educational example of a multi-agent system, whereas Microsoft's [AutoGen](https://github.com/microsoft/autogen) is a seasoned year-old framework. Nonetheless, I haven't seen anyone do this yet, and it's interesting to see how you'd do the same things in either.

For a review of AutoGen, see [my previous post](../multi-agent-chats-as-the-step-beyond-chatgpt). Note that both that review and this article pertains to AutoGen 0.2, even though [a major release (0.4) is happening at the time of writing](https://microsoft.github.io/autogen/0.2/blog/2024/10/02/new-autogen-architecture-preview).

## Swarm

At the heart of the Swarm are two notions: routines and handoffs (I'll explain below, though [this OpenAI handbook explains each well](https://cookbook.openai.com/examples/orchestrating_agents)). Autogen implements both, albeit slightly differently. But before we get into that, let's talk about the agents themselves.

### Agents

In both AutoGen and Swarm, agents are the basic unit of operation. In the previous post, I described AutoGen agents as 'a fancy word for "LLM prompts with tool access and execution environment"', and that's not really different in Swarm[^1].

Likewise, tools are the same in both frameworks - they're Python functions that you register to an agent[^2]. 

[^1]: In Swarm, the execution environment is whatever env you're running in; in AutoGen, there's a notion of automatic containerization. I assume it's going to take [E2B.dev](https://e2b.dev/) about a day to implement an out-of-the-box solution for this, though.
[^2]: Due to the execution environment sameness, there's no notion of "executing agent" in Swarm like there is in AutoGen - the agent calls the tool, and that's that. In AutoGen, you can register the tool to the agent and make it both the `caller` and the `executor` to achieve a similar effect.

### Routines

This is the same as an agent prompt in AutoGen - each Swarm agent has a natural-language routine (imagine "task list") that it follows.

### Handoffs

This is a little different - in Swarm, the agent keeps going until it explicitly makes a tool call that "hands off" to another agent (i.e. returns an `Agent` object from the tool call).  In AutoGen, a multi-agent conversation is managed by `GroupChatManager`, which selects the next agent (which can be the same agent!) to speak based on the conversation history and the agent's description.

AutoGen allows you to define ["StateFlow"](https://microsoft.github.io/autogen/0.2/blog/2024/02/29/StateFlow/) - a set of allowable/disallowed transitions between agents. I find this to be a little more concise than Swarm's approach, but it does have its own abstraction.

## Other differences

### Terminating the conversation

AutoGen has a notion of `TERMINATE` message that an agent issues once done with the task at hand. ([Weaker models tend to not get there, getting stuck in "gratitude loops"](https://microsoft.github.io/autogen/0.2/docs/FAQ/#agents-keep-thanking-each-other-when-using-gpt-35-turbo), which is my favorite fact about AutoGen.)

As far as I could tell from looking at the code, Swarm doesn't have this notion - rather, I _think_ there's an assumption that the user and the agent will take turns until the conversation is done. (Currently looking through the examples to confirm.)

Of note, both frameworks implement a notion of `max_turns` (Swarm) / `max_rounds` and `max_consecutive_auto_reply` (AutoGen) to cap execution loops.

### Evaluations

Unlike AutoGen, Swarm is at least eval-aware - [it ships with an `airline` example](https://github.com/openai/swarm/tree/main/examples/airline#evaluations), which tests whether a tool is called when the conversation implies. The test framework, such as it is, is hand-rolled and not terribly flexible.

AutoGen is technically amenable to using e.g. pytest/DeepEval for evaluations, but it's not built-in and it's hard to test multi-agent workflows end-to-end. (You can use DeepEval the way I have in the "cover letter generator" hobby project, but it only implements per-agent tests without any tool calling.)

### Observability

Swarm wins here: it's just an OpenAI call, so all observability wrappers ([like Langfuse](../langfuse-prompt-workflow)) should "just work". AutoGen has several options, all a little unsatisfying - talk to the SQLite database or use the AgentOps third-party cloud solution, which trades comfort off for privacy.

### Provenance, maintenance, and community

Swarm is OpenAI's child [with no promises of updates or maintenance attached](https://twitter.com/shyamalanadkat/status/1844934179013919085). AutoGen is maintained by a group at Microsoft, has been actively developed for the past year, and has a thriving Discord community.

## Summary table

| Feature                        | Swarm                                                                                       | AutoGen                                                                             |
|---------------------------------|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| Agents                          | Basic unit of operation; Python functions registered as tools                               | LLM prompts with tool access and execution environments                             |
| Tools                           | Python functions registered to agents                                                      | Same                                                                                   |
| Execution Environment           | Current environment; no executing agent concept                                             | Containerized environment; agents can be both caller and executor                   |
| Routines                        | Natural-language routine (task list)                                                       | Same                                                                                   |
| Handoffs                        | Agent continues until explicit handoff via tool call                                        | Managed by GroupChatManager; supports StateFlow for agent transitions               |
| Terminating the Conversation    | No explicit termination; uses `max_turns`                                                   | `TERMINATE` message; also uses `max_rounds` and `max_consecutive_auto_reply`        |
| Evaluations                     | Eval-aware, with a hand-rolled test framework, not very flexible                            | No built-in evaluations; flexible with pytest/DeepEval but hard to test multi-agent |
| Observability                   | Integrated with OpenAI, works with wrappers like Langfuse                                   | SQLite or third-party solutions like AgentOps                                       |
| Provenance, Maintenance, Community | OpenAI project with no guarantees of updates or maintenance                             | Actively developed by Microsoft with a thriving community                           |

## Conclusion

Swarm is a great educational tool to build a multi-agent system from scratch, allowing you to understand each bit. AutoGen, however, has taken the lessons learned from that endeavor and implemented them in a way that's more flexible and more powerful. Consequently, this is not really a fair comparison.

I'll be watching the development of Swarm with interest, though.
