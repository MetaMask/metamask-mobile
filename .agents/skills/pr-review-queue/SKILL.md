---
name: pr-review-queue
description: Add a pull request to the MetaMask PR review queue project board. Use when the user asks to add a PR to the review queue, submit a PR for review tracking, or add to the MetaMask project board.
---

# PR Review Queue

Add a pull request to the [MetaMask PR review queue](https://github.com/orgs/MetaMask/projects/64/views/1) project board.

## Input

- **PR URL or PR number** (required)
- **Priority** (ask user, default: "Priority 3" — see step 1 below for fetching options dynamically)

## Method

### 1. Fetch project fields (Priority options + field IDs)

Priority options can change — always fetch them dynamically:

```bash
gh project field-list 64 --owner MetaMask --format json
```

From the JSON response:

- Find the field with `"name": "Priority"` → extract its `id` (the Priority field ID) and its `options` array (each with `id` and `name`).
- Find the field with `"name": "Comment"` → extract its `id` (the Comment field ID).

Use the `AskQuestion` tool to present the Priority options and ask the user to pick one. Default to the option whose name contains "Priority 3" if the user does not specify.

### 2. Add PR to the project

```bash
gh project item-add 64 --owner MetaMask --url <PR-URL> --format json --jq '.id'
```

This returns the **item node ID** needed for field updates.

### 3. Get project node ID

```bash
gh project view 64 --owner MetaMask --format json --jq '.id'
```

### 4. Set Priority field

Use the Priority field ID and selected option ID obtained in step 1.

```bash
gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId,
      itemId: $itemId,
      fieldId: $fieldId,
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }
' -f projectId="<PROJECT_NODE_ID>" \
  -f itemId="<ITEM_NODE_ID>" \
  -f fieldId="<PRIORITY_FIELD_ID>" \
  -f optionId="<SELECTED_OPTION_ID>"
```

### 5. Set Comment field with current date

Use the Comment field ID obtained in step 1.

Automatically compute today's date in short month + day format (e.g. "Feb 21", "Mar 4", "Jan 10") — do NOT ask the user for this value.

```bash
DATE_COMMENT=$(date +"%b %-d")

gh api graphql -f query='
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $comment: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId,
      itemId: $itemId,
      fieldId: $fieldId,
      value: { text: $comment }
    }) { projectV2Item { id } }
  }
' -f projectId="<PROJECT_NODE_ID>" \
  -f itemId="<ITEM_NODE_ID>" \
  -f fieldId="<COMMENT_FIELD_ID>" \
  -f comment="$DATE_COMMENT"
```

## Output

Confirm the PR was added to the review queue with:

- A link to the project board
- The priority that was set
- The date comment that was added
