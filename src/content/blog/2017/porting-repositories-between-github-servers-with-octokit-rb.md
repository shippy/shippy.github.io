---
title: "Porting repositories between GitHub servers with octokit.rb"
pubDate: "2017-06-19"
categories:
  - "code"
---

The project I'm working on, [PsychTaskFramework](https://github.com/YaleDecisionNeuro/PsychTaskFramework), was initially developed on Yale's private `git` instance. This made perfect sense at the time: the project had no non-Yale collaborators and `git.yale.edu` is easily accessible to anyone with a Yale ID. And if we need to move later, no big deal, right? GitHub has to have a simple mechanism of porting repositories.

`git` repositories, yes. GitHub repositories - with labels, milestones, issues, pull requests, and comments? Not so much. The official GitHub support response was that I should avail myself of the API. So I did.

**Note 1:** My approach makes some avoidable compromises that I note below. Other shortcomings, however, are inherent to the process. The main one is the loss of all GitHub event metadata: all actions and events will appear to have been done at the time of the upload, by the uploading user account. (Luckily, this doesn't apply to `git` metadata.)

**Note 2:** I use Ruby and `octokit.rb`, but this approach should generalize easily to [other languages for which Octokit is available](https://github.com/octokit).

## Existing solutions

I'm not the first to run into this problem. Here are the three alternative solutions that I found most easily, None of them ports milestones or pull requests, nor are they actively maintained, but they might just get the job done, or at least form the backbone of your own solution.

- If your repositories are not confined to the internal network, you might like [`github-issue-mover`](https://github.com/google/github-issue-mover).
- [`github-issue-migrate`](https://github.com/trbritt/github-issue-migrate) is an easily extensible Ruby class.
- [`github-issue-import`](https://github.com/IQAndreas/github-issues-import/blob/master/gh-issues-import.py) is a configurable tool written in Python. It makes certain choices about indicating issue state, e.g. ports closed issues as open issues that start with the word "\[CLOSED\]". It doesn't guarantee issue / milestone number equality, but if you're porting to an empty repository and you've never deleted a milestone, that might not be a problem.

Since I wanted to preserve milestones and pull requests -- and, in most regards, to essentially make a carbon copy of the original repository -- I had to roll my own. Here's how I did it. (If you're impatient, [here are the scripts as gists.](https://gist.github.com/shippy/6ea23180e89a1d19935ec9931d8d647c))

## Step 1: Copy the commits, branches, and the wiki

This one is easy, because each `git` repository is a full copy. Just initialize a GitHub repo and push the bare Enterprise repository to it. [GitHub has a step-by-step approach here; it includes moving the wiki, too.](https://help.github.com/enterprise/2.2/admin/articles/moving-a-repository-from-github-com-to-github-enterprise/)

## Step 2: Get personal access tokens for both systems

For password-less authentication, go to _Settings > Developer settings > Personal access tokens_ (`/settings/tokens` on each GitHub instance) and generate one. I was liberal with the scopes I allowed the tokens to have; the `repo` scope should be sufficient, but I haven't tested it.

You will want to revoke these tokens after you're done.

Alternatively, you can use [any of the other forms of authentication that Octokit works with](https://github.com/octokit/octokit.rb#authentication).

## Step 3: Retrieve every GitHub object from the source repo

(Technically, you could retrieve each object in Step 4, as needed. I wanted to investigate the structure of the retrieved objects, though, and do it offline.)

This is the more straightforward part. Download labels, milestones, issues, pull requests, and comments; do so in the order in which they were created. This will make things a little easier later.

```ruby
require 'octokit'
require 'json'

# Part 1: Extract issues & everything else from the source repo
## Setup
Octokit.configure do |c|
  c.api_endpoint = 'https://git.yale.edu/api/v3/'
  c.auto_paginate = true
end
# set ENTERPRISE_TOKEN prior to this line
yalegit = Octokit::Client.new(:access_token => ENTERPRISE_TOKEN)
repoName = 'levylab/RNA_PTB_task'

## Action
opts = {:state => :all, :sort => :created, :direction => :asc}
labels = yalegit.labels(repoName, {:state => :all})
issuesAndPRs = yalegit.issues(repoName, opts)
pulls = yalegit.pull_requests(repoName, opts)
milestones = yalegit.milestones(repoName, opts)
comments = yalegit.issues_comments(repoName, opts)

## Intermediate save
# Returned objects are Sawyer resources; we need
# `sawyer_resource.map(&:to_h)` to serialize them.
File.open('labels.json', 'w') do |f|
  f.write(labels.map(&:to_h).to_json)
end
# (...and so on for every element)
```

Why did we name a variable `issuesAndPRs` and then _also_ retrieved pull requests? The Issues API treats pull requests as if they were issues. The Pull Request API obtains additional information that will be useful later.

## Step 4: Push to the target repo -- in good order

This is where things get a little tricky. Here's why.

1. **GitHub disallows you from deleting issues**. To preserve links to issue numbers, you need to add the issues in the right order.
2. **GitHub _does_ allow you to delete a milestone**, but it will only re-use its number if no newer milestone has been created since. Consequently, you will need to create placeholder milestones if you made any omissions.
3. **GitHub doesn't allow you to set the numerical identifier for an object.**
4. **GitHub only allows link to objects that already exist.** Consequently, we need to make sure that if we create an issue with a label, the label's already there.

The order we're going with is labels-milestones-issues-pulls-comments. Don't forget to adjust Octokit configuration for the target GitHub server:

```ruby
require 'octokit'
require 'json'

# Part 3: Upload everything to target repo on GitHub
## Setup
Octokit.configure do |c|
  c.api_endpoint = 'https://api.github.com/'
  c.auto_paginate = true
end
# set GITHUB_TOKEN prior to this line
github = Octokit::Client.new(:access_token => GITHUB_TOKEN)
repo = 'YaleDecisionNeuro/PsychTaskFramework'
```

### Labels

The main gotcha here is that GitHub has some default labels, which your source repository may or may not be partially using. If it is, we'll upload them, and if it isn't, they shouldn't be there anyway, so let's remove them:

```ruby
github.labels(repo).each do |l|
  github.delete_label!(repo, l[:name])
end
```

In no particular order, read and upload your original labels:

```ruby
labels = JSON.parse(File.read('labels.json'), {symbolize_names: true})
labels.each do |l|
  begin
    github.add_label(repo, l[:name], l[:color])
    puts "Added #{l[:name]} - ##{l[:color]}"
  rescue Exception => e
    puts "#{l[:name]} already exists, updating:" if e.class == Octokit::UnprocessableEntity
    github.update_label(repo, l[:name], {color: l[:color]})
  end
end
```

### Milestones

As explained above, GitHub insists on numbering milestones by itself, but also allows milestone deletions. So we just need to pay attention to any milestones that are missing in our original data.

```ruby
milestones = JSON.parse(File.read('milestones.json'), {symbolize_names: true}).sort_by {|m| m[:number]}
current_milestone = 0
fake_milestones = []
milestones.each do |m|
  current_milestone = current_milestone + 1
  while m[:number] > current_milestone
    github.create_milestone(repo, "fake #{current_milestone}")
    fake_milestones << current_milestone
    current_milestone = current_milestone + 1
  end
  github.create_milestone(repo, m[:title], {state: m[:state], description: m[:description]})
end
```

After that, it's trivial to remove the placeholders:

```ruby
fake_milestones.each do |fake|
  github.delete_milestone(repo, fake)
end
```

### Issues, PRs, and comments

We'll do all of issues, pull requests and comments in a single loop through the issues.

(This strikes some compromises that are harder to defend. The most complete approach, at least with the objects we'd retrieved thus far, would take separate passes for issue / PR creation, adding comments in the right order, and closing the issues if appropriate. The Octokit comment object does not include a direct reference to the issue number, though, and while extracting it is trivial, I just wanted to be done.)

First, we'll load the files, extract useful identifiers, and create the issue. Since issues are also auto-numbered but cannot be deleted, we'll also guard against the possibility of duplicating issues we had already added:

```ruby
issuesAndPRs = JSON.parse(File.read('issuesAndPRs.json'), {symbolize_names: true}).sort_by { |p| p[:number] }
pulls = JSON.parse(File.read('pulls.json'), {symbolize_names: true}).sort_by { |p| p[:number] }
comments = JSON.parse(File.read('comments.json'), {symbolize_names: true}).sort_by { |p| p[:id] }

# In case uploading was interrupted, note the uploaded issues
issues_uploaded = github.issues(repo, {state: :all, sort: :created, direction: :desc})

issuesAndPRs.each do |i|
  # Extract identifiers from the issue
  # Skip existing issues
  issue_number = i[:number]
  unless issues_uploaded.empty?
    last_issue_id = issues_uploaded[0][:number]
    if issue_number <= last_issue_id
      next
    end
  end

  issue_url = i[:url]
  issue_labels = i[:labels].map { |l| l[:name] }
  begin
    issue_milestone = i[:milestone][:number]
  rescue Exception
    issue_milestone = nil
  end

  # Create issue
  sleep(3) # to avoid rate limiting
  github.create_issue(repo, i[:title], i[:body], {milestone: issue_milestone, labels: issue_labels})
end
```

But instead of closing the loop and going to the next issue, we'll do three more things. First, if the original issue was actually a pull request, we'll convert it into a PR or at least note the origin:

```ruby
if i.key?(:pull_request)
  current_pull = pulls.select { |p| p[:number] == issue_number }[0]
  base = current_pull[:base][:ref]
  head = current_pull[:head][:ref]
  if i[:state] == "open"
    github.create_pull_request_for_issue(repo, base, head, issue_number)
  else
    merge_commit_sha = current_pull[:merge_commit_sha]
    base_sha = current_pull[:base][:sha]
    head_sha = current_pull[:head][:sha]
    pull_note = "**Migration note**: This was a pull request to merge "
    pull_note << "`#{head}` at #{head_sha} into `#{base}` at #{base_sha}. "
    pull_note << "It was merged in #{merge_commit_sha}.\n\n"
    new_body = pull_note + current_pull[:body]
    github.update_issue(repo, issue_number, { body: new_body })
  end
end
```

Second, we'll add the original comments to the issue:

```ruby
comments.select { |c| c[:issue_url] == issue_url }.each do |c|
  github.add_comment(repo, issue_number, c[:body])
end
```

Finally, we'll close the issue if appropriate:

```ruby
if i[:state] != 'open'
  github.close_issue(repo, issue_number)
end
```

This is a little confusing, so I'm noting again that [the upload script is also available as a gist](https://gist.github.com/shippy/6ea23180e89a1d19935ec9931d8d647c#file-2-uploadtogh-rb).

## Step 5: Start working with the new copy of the repository

Add remotes to your working copies. Lock or remove the existing issues. Hang a big banner saying "Work has moved to a new location." [Set up a post-receive hook that will automatically re-push commits to their new home.](http://stackoverflow.com/a/30409801/2114580)

## Omissions, shortcomings, compromises

I was going for a good-enough facsimile, not the perfect replica. Here's what I skipped, and how you could preserve it if you cared to.

- I didn't preserve **complex issue timelines** -- multiple closings and re-openings, changes of labels and milestones, and the like. You could retrieve the events _and_ the comments via `source.issue_timeline(repo, issueNumber)`, sort by `:created_at`, and add them to the target repository in the right order using the requisite API command. (In fact, you could retrieve everything via `source.repository_events(repo)` and then use the strategy pattern to walk the entire repo history. If I were making a fully general solution, that's what I'd go for.)
- I haven't ported **merged pull requests**. In order for the GitHub API to create a pull request from an issue, there needs to be a difference between the `base` and `head` refs fails, Since the merge definitionally removed this difference, the API will refuse the conversion. To get around this, you'd have to find a way to "replay" the commits along with the repository events. Leaving a quick note about the historical origin of the repository seemed like a reasonable compromise.
- In comments and issue descriptions, GitHub automagically creates links to existing issues. **Automagic issue linking doesn't happen if the issue doesn't exist yet.** You can get most of this by adding comments in the order in which they appeared, but even that can occasionally fail -- e.g. if you edited the checklist in the issue OP to link to a relevant issue created later. (You can hack this by iterating through all target issues and comments and making an invisible change like adding a space.)
- **Hard links point to the wrong location**, which is to the source repo (e.g. the `README.md` linking to a wiki page, or a comment pointing to [the canonical URL of a particular file at a particular commit](https://help.github.com/articles/getting-permanent-links-to-files/)). A content filter that replaces `source URL` with `target URL` before it pushes milestones, issues / PRs, and issue comments would be a clean way of fixing this.
- There's **no issue locking**, because I hadn't locked any issues. It is trivial to add, though: check the boolean `i[:locked]`.
- **Reactions to comments are lost**. I'm not sure it would make sense for the uploader to add them.
