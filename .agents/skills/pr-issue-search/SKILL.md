---
name: pr-issue-search
description: Find related GitHub issues for a pull request by extracting from branch name, commit messages, or searching GitHub. Use when the user asks to find related issues, link issues to a PR, or search for GitHub issues to reference.
---

# PR Issue Search

## Strategy

Follow these steps in order. Stop as soon as you have issue numbers.

### Step 1: Extract from branch name

```bash
git rev-parse --abbrev-ref HEAD
```

Branch naming conventions (check both):

**GitHub issue number**: `<type>/<issue-number>_<short-kebab-description>`

- `fix/1234_wallet-connection-issue` --> `#1234`
- `feat/5678_add-nft-gallery` --> `#5678`

**Jira ticket ID**: `<type>/<PROJECT-NUMBER>_<short-kebab-description>`

- `feat/MCWP-392_pr_desc_skills` --> Jira ticket `MCWP-392`
- `fix/MOB-1234_fix-crash` --> Jira ticket `MOB-1234`

Pattern: after the `<type>/` prefix, look for either a bare number (`\d+`) for GitHub issues or an alphanumeric project key (`[A-Z]+-\d+`) for Jira tickets.

- `chore/update-linting-config` --> no issue or ticket, continue to Step 2

### Step 2: Extract from commit messages

```bash
git log main..HEAD --oneline
```

Look for `#NUMBER` references (GitHub issues) and `[A-Z]+-\d+` patterns (Jira tickets) in commit subjects. Collect all unique references.

### Step 3: Search by keywords

Only if Steps 1-2 found no issue numbers.

Build keywords from the branch name segments and commit subjects (strip type prefix, split on hyphens/underscores).

**Prefer `gh` CLI** (no permission prompt required):

```bash
gh search issues --repo MetaMask/metamask-mobile "<keywords>" --limit 5
```

**Fallback to GitHub MCP** if `gh` is unavailable:

Use the `search_issues` tool from the `user-github` MCP server:

```json
{
  "server": "user-github",
  "toolName": "search_issues",
  "arguments": {
    "query": "<keywords>",
    "owner": "MetaMask",
    "repo": "metamask-mobile",
    "perPage": 5
  }
}
```

Review results and pick the most relevant issue(s).

## Output Format

- `Fixes: #NUMBER` -- use when the PR fully resolves the issue (closes on merge)
- `Refs: #NUMBER` -- use when the PR partially addresses or is related to the issue

If multiple issues are found:

```
Fixes: #1234
Refs: #5678
```

If no issues are found, leave the section as:

```
Fixes:
```

## Examples

**Branch with GitHub issue number:**
Branch `fix/9012_token-balance-stale` --> `Fixes: #9012`

**Branch with Jira ticket ID:**
Branch `feat/MCWP-392_pr_desc_skills` --> `Refs: MCWP-392` (Jira tickets go in `Refs:`, not `Fixes:`, since GitHub cannot auto-close Jira tickets)

**Commit with reference:**
Commit message `implement caching for token prices (#3456)` --> `Refs: #3456`

**Keyword search:**
Branch `feat/bridge-fee-estimation` --> search "bridge fee estimation" --> find issue #7890 "Bridge: show estimated fees before confirmation" --> `Fixes: #7890`
