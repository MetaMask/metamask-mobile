---
name: pr-review-queue
description: Add a pull request to the MetaMask PR review queue project board. Use when the user asks to add a PR to the review queue, submit a PR for review tracking, or add to the MetaMask project board.
---

# PR Review Queue

Add a pull request to the [MetaMask PR review queue](https://github.com/orgs/MetaMask/projects/64/views/1) project board.

## Input

PR URL or PR number.

## Method

**Prefer `gh` CLI:**

```bash
gh project item-add 64 --owner MetaMask --url <PR-URL>
```

**Fallback via GraphQL** (GitHub MCP has no project tools):

```bash
# Get project node ID
gh project view 64 --owner MetaMask --format json --jq '.id'

# Get PR node ID
gh pr view <PR-NUMBER> --json id --jq '.id'

# Add item
gh api graphql -f query='
  mutation($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
      item { id }
    }
  }
' -f projectId="<PROJECT_NODE_ID>" -f contentId="<PR_NODE_ID>"
```

## Output

Confirm the PR was added to the review queue with a link to the project board.
