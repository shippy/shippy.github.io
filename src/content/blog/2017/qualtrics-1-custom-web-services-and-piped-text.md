---
title: "Adventures with Qualtrics, part 1: Custom Web Services and Piped Text"
pubDate: "2017-06-02"
categories: 
  - "code"
  - "qualtrics"
  - "science"
---

To create a feature in a pilot study I was running in December, I took a dive into Qualtrics API and custom web service building. In the process, I discovered a couple of workarounds and little-documented properties of both. The key to integrating them: piped text.

## Piped Text: The Qualtrics Variable

With [piped text](https://www.qualtrics.com/support/survey-platform/survey-module/editing-questions/piped-text/piped-text-overview/), you can insert any [embedded data](https://www.qualtrics.com/support/survey-platform/edit-survey/survey-flow/standard-elements/embedded-data/) and any answer your subject gave into (almost) any Qualtrics context.

If this doesn't excite you, it should.

Let me rephrase. Piped text references the content of variables you can set. It can do this in conditional validation, display logic and survey flow. (You can't make it into a GOTO, but that might be a good thing.) The documentation undersells this; this [Qualtrics blog article](https://www.qualtrics.com/blog/why-we-love-piped-text-and-you-should-too/) does it a little more justice.

For my purposes, the most important insight goes unmentioned: **you can use piped text to pass data to an external web service**. That way, you can use data from an in-progress session as input for arbitrarily complex logic implemented in a programming language of your choice.

## The approach

How does this work? First, you identify the shortcode for an answer or embedded field. Then, you insert it into the URL, like so:

```
http://your.service.URL/${e://Field/Identifier}/${q://QID1783/ChoiceTextEntryVField>
```

This will substitute the value of `Field` and the answer to question `QID1783` in time for the redirect.

Qualtrics can call an external service in two ways.

1. **End-of-survey redirect.** Qualtrics simply passes the torch to your service, which wraps up the session for your participant.
2. **Web Service step in Survey Flow.** Your service will pass results back to Qualtrics, and they'll be available for as embedded data for the following Qualtrics questions in that session. (With the "Fire and Forget" setting, this can be asynchronous.)

The external service then passes the results back to Qualtrics.

## What's the pass-back format?

"Pass results back to Qualtrics" glides over a big issue: Qualtrics documentation does not provide a list of valid return formats. The documentation and [the only StackOverflow answer I could find](http://stackoverflow.com/q/21445897/2114580) both mention RSS as the only example of an acceptable format. [The random number generator](http://reporting.qualtrics.com/projects/randomNumGen.php) everyone uses for [MTurk compensation](http://brentcurdy.net/qualtrics-tutorials/link/), however, has a much simpler outcome: `random=7`. That's hopeful, but what if you want to pass multiple values back? Docs don't say.

[I decided to test this out on a dummy web service I wrote in Sinatra.](https://github.com/shippy/qualtrics-web-service) **It turns out that Qualtrics will take data from JSON, XML, and URI query element.** (That's `?a=b&c=d` - I owe this insight to [Andrew Long at the Behavioral Lab](https://thebehaviorallab.wordpress.com/2013/10/28/how-to-randomize-or-shuffle-an-array-in-qualtrics/).) You can try this out for yourself -- just put down [https://salty-meadow-86558.herokuapp.com/](https://salty-meadow-86558.herokuapp.com/) as your Web Service in Qualtrics.

## Pulling the API in

My project required more data to the custom Web service than Piped Text could conveniently pass, which meant that I needed to tangle the API. For that, [see part two](http://simon.podhajsky.net/blog/2017/qualtrics-2-exporting-latest-response-via-api/).
