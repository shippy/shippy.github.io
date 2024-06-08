---
title: "Adventures with Qualtrics, part 2:  exporting the latest response via API"
date: 2017-06-05
categories:
  - "code"
  - "qualtrics"
  - "science"
---

_(In Part 1, [I wrote about the role of Piped Text and building a custom web service that Qualtrics will recognize](http://simon.podhajsky.net/blog/2017/qualtrics-1-custom-web-services-and-piped-text/).)_

For the feature I was trying to implement in December, I needed to evaluate a batch of responses the subject answered earlier in the survey. Luckily, Qualtrics has an API that allows for response export! While the documentation has [an example of a response export workflow](https://api.qualtrics.com/docs/response-exports), I found their per-format export pages more informative. [Here's the CSV export documentation page.](https://api.qualtrics.com/docs/csv) Still, I ran into some issues that merit documenting.

## Requesting a single response? You can't

**Since one of the embedded fields that Qualtrics creates is `ResponseID`, can't we just pass that and let our external service use it to grab our current participant's set of responses? Sadly, no.** Qualtrics doesn't allow you to query at the level of a response, only at the level of a survey. (There is an optional `lastResponseId` parameter in the export query, but that will only get you all responses entered _after_ the survey you're calling the service from. This could be useful if we were building a dataset incrementally, but in my case, I needed the data almost immediately.)

Instead, I assign the subject a unique ID early in the survey. This can be either pre-assigned or generated in the survey - perhaps with the random number generator web service I mentioned above. I pass this ID to my web service, which will use it to pick out the right response.

But we can't select on any response-level variable. This means that to limit our queries, we'll have to do some guessing. If we're sure that there are no race conditions -- i.e. only one person at a time only ever takes the survey -- we can use `limit = 1` to only get the last response. Alternatively, if you know that the external service will be called immediately after the participant fills out the survey, you can use `startDate` set to a few hours before current time. ([NB: the parameter value takes ISO-8601 format.](https://api.qualtrics.com/docs#date-format).)

## The Nitty Gritty

Now, let's look at an example of the inquiry logic. In the abstract, there are three steps: get the response, unzip it, and load it into an appropriate data structure.

```ruby
# Excerpt from a Sinatra helper function
response_zip = getResponseFromQualtrics()
response_string = unzip(response_zip)
csv_table = rawToTable(response_string)
```

### Step 1: Get the data

Getting the data is a two-step process. First, I request a CSV file from Qualtrics and wait until it's ready. Second, I download it.

Instead of implementing the handshake myself, I took advantage of the [`qualtrics_api` Ruby gem](https://github.com/CambridgeEducation/qualtrics_api) made by [Yurui Zhang](https://github.com/pallymore). (There's also [sunkev's `qualtrics` gem](https://github.com/sunkev/qualtrics), which I haven't tried.)

```ruby
def getResponseFromQualtrics
  start_time = getStartTime(settings.prior_hours)

  QualtricsAPI.configure do |config|
    config.api_token = settings.token
  end

  survey = QualtricsAPI.surveys[settings.survey]
  export_service = survey.export_responses({start_date: start_time})
  export = export_service.start

  while not export.completed?
    sleep(5)
    export.status
  end

  require 'open-uri'
  return open(export.file_url, "X-API-TOKEN" => settings.token).read
end

def getStartTime(hours_offset)
  require 'time'
  start_time = Time.now.utc - (60 * 60 * hours_offset)
  return start_time.iso8601
end
```

(These are Sinatra helpers. `settings` is a Sinatra-wide global that reads in secrets specified in the environment and various other configuration. ([The `dotenv` gem](https://github.com/bkeepers/dotenv) is excellent for secret storage in development; as for production, [here's how to set secrets on Heroku](https://devcenter.heroku.com/articles/config-vars).)

### Steps 2 & 3: Unzip and convert

`unzip` is just `rubyzip`; no magic there. There is a bit of a trick to getting a compressed stream to a CSV with headers, though. That's because some of the Ruby `CSV` methods can only deal with files, not streams.

```ruby
def rawToTable(response_string)
  require 'csv'
  response_csv = CSV.new(response_string, headers: true)
  response_csv = response_csv.read
  response_csv.delete_if do |row|
    # Remove the row with descriptions & internal IDs
    /^R_/ !~ row['ResponseID']
  end
  return response_csv
end
```

And done!

After this, I select the row that contains the subject ID I had passed in the Qualtrics redirect, pick a choice and evaluate it, and visualize it with an assist from the wonderful [`animate.css` library](https://github.com/daneden/animate.css) at an endpoint created by [Sinatra](http://www.sinatrarb.com/intro.html) and [deployed to Heroku](https://devcenter.heroku.com/articles/git). Unlike Qualtrics features, all are well-documented elsewhere.

## Approach 2: Avoid the API, pass the values

The API approach has a number of problems. For one, Qualtrics API is a paid feature. Worse, API calls lag -- at least once, the call and processing took over 30 seconds and caused a [request timeout.](https://devcenter.heroku.com/articles/request-timeout) While I could re-write the interface so that the API call and processing are done by a background process that the front-end checks for periodically, it's a pain that might not be worth it.

The obvious alternative: instead of a subject identifier, **pass the responses that the survey has readily available via URL.** [I write about this in part 1.](http://simon.podhajsky.net/blog/2017/qualtrics-1-custom-web-services-and-piped-text/)

There are limits. Because Qualtrics uses `GET` for everything, [you might have to keep your URI under 2000 characters](http://stackoverflow.com/a/417184/2114580). Basically, don't try to transmit essay responses. (I was worried that Qualtrics itself might throw a fit if I tell it to store 56k-character URI, because piped text is obviously longer than the response it denotes. I shouldn't have worried. Qualtrics managed even a 100k-character URI without a hiccup -- and that's way past the 2,000 characters that your browser and your server can handle. In other words, Qualtrics isn't going to be your constraint.)

As usual, the trade-off for speed is maintainability. You refer to many piped text variables instead of just one or two, so you will likely have to develop a pipeline to generate the URI. You might have named your questions for clearer data manipulation, but for the purposes of piped text, you'll have to replace them with the internal question IDs (`QID#`). And while you can maintain the order of values in one place, you have to explicitly plan for that.

## Bonus Approach: No API is best API

Finally, I should note that custom web services and APIs are an extra overhead. For simpler problems, there are at least two steps to attempt first.

### 1\. Abusing Survey Flow

Basic Survey Flow building blocks are quite powerful, making many problems tractable with stock Qualtrics. To pick randomly from a bag of option sets, you can use Randomization to pick exactly one of `n` embedded data blocks underneath it. Branches, of course, offer basic `if` conditionals (although not `else` -- you'll have to take care to make their triggering conditions mutually exclusive).

### 2\. JavaScript

You can do some things with the Qualtrics Javascript. (For instance, if you can you get arbitrary piped text, that could make things easier.) You will need to weigh how much crucial logic you want to embed in JavaScript -- if you don't control the survey-taking environment, you cannot guarantee that the client has JS enabled, and you might have to take extra steps to either degrade functionality graciously or detect the absence.

## Other approaches?

It is very possible that other approaches exist; they were not necessary for my purposes. In one of my next articles, I hope to talk about what they were.
