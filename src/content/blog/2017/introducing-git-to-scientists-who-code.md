---
title: "Introducing git to scientists who code"
pubDate: "2017-02-15"
categories:
  - "code"
  - "science"
---

Many scientists treat coding -- tasks, analysis, you name it -- as a necessary evil we have to do in order to get to the science. You might know the result from your own scientific practice: subtle changes to the code strewn across many folders, days spent getting into the mind of the postdoc author five years gone, and a general unwillingness to touch the code unless it's time to re-use it.

Before joining a research lab, I was lucky to have spent several years as a back-end programmer with the [Yale Student Developers](https://yalestc.github.io/). (Best work-study job ever.) Consequently, working without proper version control and thorough documentation of each step now just feels _icky_.

(This isn't my personal quirk, by the way. "Use version control" is the fifth recommendation of both Aruliah et al.'s [Best Practices for Scientific Computing (2012)](http://arxiv.org/pdf/1210.0530v1.pdf) and Wilson et al.'s [Good Enough Practices for Scientific Computing (2016)](https://arxiv.org/abs/1609.00037). So, at the very least, I can say that I share a squick with a number of published researchers.)

Since joining Yale Decision Neuroscience Lab, I've been inducing colleagues to use `git`. The presentation that I gave yesterday is a very high-level overview of what `git` is good for:

<iframe src="https://docs.google.com/presentation/d/1u0_7L4CmTy0FP_vGAJMq8j9KvW6BndXIXQqTJqzQzdc/embed?start=false&amp;loop=true&amp;delayms=5000" frameborder="0" width="960" height="569" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

(It doesn't hold a candle to Alice Bartlett's excellent [`Git` for humans](https://speakerdeck.com/alicebartlett/git-for-humans), which I heartily recommend, but it _does_ use our lab's problems as illustrations.)

## Where do we from here?

Giving a tech presentation is only the first step in tech adoption. I lack a detailed roll-out plan, but here's what I'm doing now:

- Since jumping straight to the command line might be too scary, I've been recommending [GitKraken](https://www.gitkraken.com/) and [GitHub Desktop](https://desktop.github.com/).
- Any code I touch lands in a remote repository rather than the lab file-share. If someone wants to use it, that's where they'll get it. If I'm asked to with anyone's code, it will need to be on that remote. This is on the theory that necessity is the best incentive.
- And, of course, I've made it clear that anyone who struggles with anything `git`\-related can contact me at any time and I'll do my best to help.

We'll see how it goes.
