# Create Bug Report

Create a GitHub issue for MetaMask Mobile using the official bug report template.

## Prerequisites

- `gh` CLI must be installed and authenticated (`gh auth status`)
- If not authenticated, prompt the user to run `gh auth login` in their terminal

## Step 1: Read the Bug Report Template

**Before doing anything else**, read the template file:

`.github/ISSUE_TEMPLATE/bug-report.yml`

Parse the `body` array using these rules to build the field list that drives all subsequent steps:

| YAML property                | How to use it                                                             |
| ---------------------------- | ------------------------------------------------------------------------- |
| `type: markdown`             | Skip — display-only, not a user input                                     |
| `id`                         | Internal identifier; use to detect special fields (see below)             |
| `label`                      | Use as the `### Section heading` in the issue body                        |
| `type: textarea`             | Free-text input; collect multi-line content                               |
| `type: input`                | Single-line text input                                                    |
| `type: dropdown`             | User picks from `options`; if `multiple: true`, allow multiple selections |
| `validations.required: true` | Field is required — do not create the issue until provided                |
| No `validations` block       | Field is optional                                                         |
| `render: shell`              | Wrap the value in a code fence in the body                                |

**Special field — `severity` (or any field whose description starts with "To be added after bug submission"):**
Do not prompt the user. Always output the fixed value: `_To be added after bug submission by internal support / PM:_`

Do not hardcode field names. The parsed list is the source of truth.

## Step 2: Duplicate Check

Ask the user for a brief description of the bug, then search for existing issues before collecting any other fields.

```bash
gh issue list \
  --repo MetaMask/metamask-mobile \
  --label "type-bug" \
  --search "<keywords from description>" \
  --state all \
  --limit 10
```

- Present any matching issues and ask if any describe the same bug
- If a duplicate is found, link to it and stop — do not create a new issue
- If no duplicate is found, proceed to Step 3

## Step 3: Collect Fields

Using the parsed field list from Step 1:

1. Prompt for all **required** fields first, in template order
2. Then offer each **optional** field (skip Severity — see Step 1)
3. For **dropdown** fields, present the valid `options` to the user
4. For **multi-select** dropdowns (`multiple: true`), allow the user to pick more than one value
5. For optional fields the user skips, use `_No response_` in the body
6. For `render: shell` fields, use an empty code fence if no value is provided

Do not create the issue until all required fields have been provided.

## Step 4: Create the GitHub Issue

```bash
gh issue create \
  --repo MetaMask/metamask-mobile \
  --title "[Bug]: <concise description>" \
  --label "type-bug" \
  --body "..."
```

### Title format

Always prefix with `[Bug]: ` followed by a concise description.

### Body format

Output each field in template order:

```
### <label>

<user value, or _No response_ if optional and skipped>
```

For `render: shell` fields, wrap the value in a code fence:

````
### <label>

```
<value, or empty if not provided>
```
````

## Step 5: After Creation

- Output the issue URL so the user can view it
- Ask the user: "Would you like me to investigate the codebase for the possible root cause? (yes/no)"
- Default is **no** — only proceed if the user explicitly says yes
- If yes, investigate the codebase (research only — no code changes) and add a comment using:

```bash
gh issue comment <issue-number> --repo MetaMask/metamask-mobile --body "..."
```

The comment should include:

- A summary of the possible root cause
- The error flow with relevant file paths and line numbers
- Key files table (file, line(s), description)
- A suggested fix approach
