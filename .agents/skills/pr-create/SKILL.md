---
name: pr-create
description: Create a GitHub pull request from the current branch. Validates preconditions, generates title and description, and opens the PR as draft. Use when the user asks to create a PR, open a pull request, or submit changes for review.
---

# PR Create

## Workflow

### 1. Precondition checks

```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain
git rev-parse --verify origin/<branch>
```

- On `main` --> abort: "Cannot create a PR from main"
- Dirty working tree --> abort: "Commit all changes before creating a PR"
- Branch not on origin --> **ask the user** if they want to push. Default answer is **no**. Never push without explicit user consent.

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
- Provide a Slack review request message in a fenced code block for easy copy

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

Tell the user they can paste it in `#metamask-mobile-dev` in the "Mobile PRs that need review" thread of the day.

### 5. Offer to add PR to review queue

Ask the user if they want to add the PR to the [PR review queue](https://github.com/orgs/MetaMask/projects/64/views/1) (see `pr-review-queue` skill if available).

## Rules

- Always create as **draft** per repo guidelines ("Submit as Draft initially for CI")
- Always assign to `@me`
- Target `main` branch
- Team label is handled automatically by CI (`add-team-label.yml`) on PR open
