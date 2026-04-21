---
name: pr-create
description: Create a GitHub pull request from the current branch. Validates preconditions, generates title and description, and opens the PR as draft. Use when the user asks to create a PR, open a pull request, or submit changes for review.
---

# PR Create

The canonical Definition of Ready For Review lives at
[`docs/readme/ready-for-review.md`](../../../docs/readme/ready-for-review.md).
This skill always opens PRs as draft. A PR is never considered ready for review
at the moment it is created.

## Workflow

### 1. Precondition checks

```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain
git rev-parse --verify origin/<branch>
```

- On `main` --> abort: "Cannot create a PR from main"
- Dirty working tree --> abort: "Commit all changes before creating a PR"
- Branch not on origin --> use the `AskQuestion` tool to ask whether to push, with options "Yes, push" and "No, abort" (default: **No, abort**). Never push without explicit user consent.

### 2. Generate a PR description

Generate a PR description for the current branch (see `pr-description` skill if available).

### 3. Create the PR + identify code owners (in parallel)

Run these two steps concurrently since they are independent:

**3a. Create the PR**

**Prefer `gh` CLI:**

```bash
gh pr create \
  --title "<generated title>" \
  --body "<generated body>" \
  --base main \
  --assignee @me \
  --draft
```

**Fallback to GitHub MCP** (`create_pull_request` tool from `user-github` server):

```json
{
  "server": "user-github",
  "toolName": "create_pull_request",
  "arguments": {
    "owner": "MetaMask",
    "repo": "metamask-mobile",
    "title": "<generated title>",
    "body": "<generated body>",
    "head": "<branch-name>",
    "base": "main",
    "draft": true
  }
}
```

**3b. Identify code owners**

Identify code owners and their Slack handles for the changed files (see `pr-codeowners` skill if available). This only depends on the diff, not the PR itself.

### 4. Output

- Print the PR URL
- Provide a Slack review request message in a fenced code block for easy copy.
  The PR was created as draft, so instruct the user to post this message only
  once the PR meets the canonical Definition of Ready For Review in
  [`docs/readme/ready-for-review.md`](../../../docs/readme/ready-for-review.md)
  and has been moved out of draft.

If code owners were found:

```
PR ready for review: <PR title>
<PR URL>
<one-line summary of what changed>
cc @<slack-handle-1> @<slack-handle-2>
```

If no code owners (or only the author's own team):

```
PR ready for review: <PR title>
<PR URL>
<one-line summary of what changed>
```

Tell the user they can paste it in `#metamask-mobile-dev` in the "Mobile PRs that need review" thread of the day **after** the PR is undrafted and meets the Definition of Ready For Review.

### 5. Offer to add PR to review queue

Use the `AskQuestion` tool to ask whether to add the PR to the [PR review queue](https://github.com/orgs/MetaMask/projects/64/views/1), with options "Yes" and "No" (default: **Yes**). If yes, invoke the `pr-review-queue` skill if available.

## Rules

- Always create as **draft**. A PR is only ready for review once it meets the canonical Definition of Ready For Review in [`docs/readme/ready-for-review.md`](../../../docs/readme/ready-for-review.md).
- Always assign to `@me`
- Target `main` branch
- Team label is handled automatically by CI (`add-team-label.yml`) on PR open
- Never mark the PR as ready for review as part of this skill, even if the user asks; that is an explicit author-side decision tied to the Definition of Ready For Review.
