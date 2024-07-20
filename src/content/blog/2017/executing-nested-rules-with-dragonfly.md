---
title: "Executing nested rules with dragonfly"
date: 2017-05-10
description: >
  Rule nesting with a voice-programming library named dragonfly for
  the win.
categories:
  - "code"
  - "voice-programming"
image: ./images/cyber_dragonfly.png
---

Rule nesting makes context-free grammars very powerful. It allows for brevity while preserving complexity — and [dragonfly](https://github.com/t4ngo/dragonfly), the unofficial Python extension to Dragon Professional Individual, seems to promise that functionality with `RuleRef`, which ["allows a rule to include (i.e. reference) another rule"](https://dragonfly.readthedocs.io/en/latest/elements.html).

But using `RuleRef` is less obvious than it would appear. How do you actually refer to the rules? How do you execute the actions that are associated with the referenced rules? And how do you ensure that dragonfly does not complain about rule duplication if you do this multiple times?

I will proceed step-by-step, but if you want to jump ahead to the solution, [you can read it on GitHub](https://gist.github.com/shippy/e10448321f6b9c1e51f836a7abf1c05c).

_If you're unfamiliar with Dragonfly, [do read this introduction to basic Dragonfly concepts in the Caster documentation.](https://caster.readthedocs.io/en/latest/caster/doc/readthedocs/examples/rules/Dragonfly%20Rules/)_

## Step 1: Include the rule with `RuleRef`

Let's start with a toy grammar. In this grammar, we will have two rules that are not exported: that is to say, you can't invoke them directly. We'll call them simply `RuleA` and `RuleB`. (I will refer to them as "subrules" from here on out.)

```python
# Rules proper
class RuleA(MappingRule):
    exported = False
    mapping = {
        "add <n>": Text('RuleA %(n)s'),
    }
    extras = [
        IntegerRef("n", 1, 10),
    ]

class RuleB(MappingRule):
    exported = False
    mapping = {
        "bun <n>": Text("RuleB %(n)s") ,
    }
    extras = [
        IntegerRef("n", 1, 10),
    ]
```

We'll call the top-level rule `RuleMain` and include Rules A and B in the extras.

```python
class RuleMain(MappingRule):
    name = "rule_main"
    exported = True
    mapping = {
        "boo <rule_b> and <rule_a>": Text("Rule matched: B and A!"),
        "fair <rule_a> and <rule_b>": Text("Rule matched: A and B!"),
    }
    extras = [
        RuleRef(rule = RuleA(), name = "rule_a"),
        RuleRef(rule = RuleB(), name = "rule_b")
    ]
```

The name argument of `RuleRef` takes care of the correspondence between the spec and the subrule. To get recognized, you do actually have to match the subrule's spec by saying e.g. "boo bun three add five".

This only carries out the `Text("Rule matched: ...")` action defined in the `MainRule`, though. To actually execute the subrules, we'll need to add the `Function` action.

## Step 2: Use (and mass-produce) `Function`

Dragonfly's [`Function`](https://dragonfly.readthedocs.io/en/latest/actions.html#function-action) allows arbitrary code execution. However, you can only pass in a function reference, to which `Function` passes the right extras (seemingly) automagically. The caster documentation gives [a useful but incomplete example](https://caster.readthedocs.io/en/latest/caster/doc/readthedocs/examples/rules/Dragonfly%20Rules/#the-function-action):

```python
def my_fn(my_key):
  '''some custom logic here'''

class MyRule(MappingRule):
  mapping = {
    "press <my_key>":     Function(my_fn),
  }
  extras = [
    Choice("my_key", {
      "arch": "a",
      "brav": "b",
      "char": "c"
    })
  ]
```

When you say "press arch", `my_fn` gets called with the value of the `my_key` extra. But what if the mapping contained a reference to another rule in another extra? Would that also be passed to `my_fn`? It turns out that `Function` actually passes [_keyword arguments_](https://docs.python.org/2/tutorial/controlflow.html#keyword-arguments). If you name the argument to `my_fn` the same as the name of your extra, then `my_fn` will be called with the value of that extra. You're not limited to one extra, either: for example, if we added an extra called `towel` to `MyRule.extras`, then `def my_fn(towel, my_key)` would receive both.

(If you define `my_fn` with `**kwargs`, it will receive all `extras` in a `dict`, including the default `_node`, `_rule`, and `_grammar`. This does lose the order in which the subrules were invoked, so you can't just pass a general function that invokes all rules unless you're happy with them being invoked alphabetically / in an arbitrary order. That was my first approach:

```python
def execute_rule(**kwargs): # NOTE: don't use
    defaultKeys = ['_grammar', '_rule', '_node']
    for propName, possibleAction in kwargs.iteritems():
        if propName in defaultKeys:
            continue
        if isinstance(possibleAction, ActionBase):
            possibleAction.execute()
```

In this case, Rule A will be executed before Rule B, no matter the optionality or the order of utterance, just because of the `kwargs` key order. I played around with exploring the default extras, but I haven't managed to figure out how to extract the order from the actual utterance to reorder the subrules automagically; that might require a deeper dive into Dragonfly than I'm ready for.)

You could write `executeRuleA(rule_a)` to run `rule_a.execute()`, then add `Function(executeRuleA)` to be executed alongside `Text` when the rule is matched. Unless you want to do different things for different rules, though, it is easiest to define a factory for functions that simply execute whatever `extras` you specify:

```python
from dragonfly import Function, ActionBase

def _executeRecursive(executable):
    if isinstance(executable, ActionBase):
        executable.execute()
    elif hasattr(executable, '__iter__'):
        for item in executable:
            _executeRecursive(item)
    else:
        print "Neither executable nor a list: ", executable

def execute_rule(*rule_names):
    def _exec_function(**kwargs):
        for name in rule_names:
            executable = kwargs.get(name)
            _executeRecursive(executable)

    return Function(_exec_function)
```

This way, if you want to execute rule B before rule A, you can add `execute_rule(['rule_b', 'rule_a'])` to the action. Equivalently, you could use `execute_rule('rule_b') + execute_rule('rule_a').` (Since both factories return a `Function`, their output can be added with [other dragonfly `Action` elements](https://dragonfly.readthedocs.io/en/latest/actions.html#function-action).)

## Step 3: Reusing subrule references in other rules

Let's say you want to reuse your subrules in another rule, like so:

```python
# Note: This doesn't execute the sub-actions at all
class CompoundMain(CompoundRule):
    spec = "did (<rule_a1> and <rule_b1> | <rule_b1> and <rule_a1>)"
    exported = True
    extras = [
        RuleRef(rule = RuleB(), name = "rule_b1"),
        RuleRef(rule = RuleA(), name = "rule_a1"),
    ]
```

If you add this to your grammar, though, dragonfly will fail to load it with the following error:

```
GrammarError: Two rules with the same name 'RuleA' not allowed.
```

How did this happen? We even renamed the extras! It turns out that each subrule instantiated in `RuleRef` is registered as a separate rule. By default, each instance will assign `name = SubRule.__name__`. Consequently, you'll have to instantiate the subrules with unique names each time you re-use them. Fun fact: those names don't have to bear any relation to anything else.

```python
    extras = [
        RuleRef(rule = RuleB(name = "Sweeney Todd"), name = "rule_b1"),
        RuleRef(rule = RuleA(name = "Les Miserables"), name = "rule_a1"),
    ]
```

## There are many like it, but this one is mine

I'm sure this is not the only way to do it: one could override the `_process_recognition` method of your `MainRule`, or perhaps [caster](https://github.com/synkarius/caster), [aenea](https://github.com/dictation-toolbox/aenea), or [dragonfluid](https://github.com/chajadan/dragonfluid) implement equivalent nesting functionality in ways that I have overlooked. I would be very excited to learn about other approaches!

For now, I'm looking forward to applying this in my [vim-grammar for dragonfly](https://github.com/shippy/vim-grammar) project. I'm hoping to write about the reasons why vim is excellent for voice programming later.
