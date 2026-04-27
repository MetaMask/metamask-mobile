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

### 3a: Infer from description

Before prompting, scan the user's description for any values that can be inferred:

- **Device** — device brand/model mentions (e.g. "iPhone 14", "Galaxy A42", "Pixel 7")
- **Operating system** — "iOS", "Android", or platform hints from the device name
- **Version** — semantic version patterns (e.g. `7.67.0`)
- **Build number** — standalone numbers that look like build numbers (e.g. `3746`)
- **Steps to reproduce** — if the description is written as steps or a clear sequence of actions
- **Build type** — mentions of "beta", "flask", or non-standard build sources
- Any other field whose value is clearly stated

For each inferred value, present it to the user for confirmation before accepting it. Example:

> I inferred the following from your description — please confirm or correct each:
>
> - **Device**: Android Galaxy A42 ✓ or enter correct value
> - **Version**: 7.67.0 ✓ or enter correct value

Only skip the confirmation prompt if no values could be inferred.

### 3b: Prompt for remaining fields

After confirming inferred values, collect only the fields that were not already inferred:

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
- If yes, perform the full **Root Cause Analysis** (Step 6)

## Step 6: Root Cause Analysis

When the user opts in, run a two-phase analysis: a cheap gathering phase (Haiku subagent) followed by an expensive reasoning phase (main context).

### Phase 1 — Gather Evidence (Haiku subagent)

Launch an Agent with `model: "haiku"` and `subagent_type: "general-purpose"`. Pass a prompt that includes the bug description, steps to reproduce, and any relevant context from the issue. The prompt must instruct the subagent to:

1. **6a gathering** — Search for files and functions related to the bug using grep, glob, and read. Trace the code path from entry point to failure point. Record file paths, line numbers, and relevant code snippets.
2. **6b gathering** — Run `git log` on affected files comparing the current release branch against the previous release branch. Collect PR numbers, titles, authors, and relevant diffs that may have introduced or surfaced the bug.
3. **6c gathering** — Search the codebase for the same pattern, function, or anti-pattern that causes the bug. List all files and locations that share the pattern.

The subagent prompt must end with this instruction:

> Return a structured summary with exactly these sections. Do NOT return raw file contents or full git logs — only the distilled findings:
>
> **Relevant files** — path, line numbers, and what each file does in relation to the bug
>
> **Code flow trace** — entry point → intermediate steps → failure point, with file:line references
>
> **Git history findings** — PR numbers, titles, authors, what changed, and how the change relates to the bug
>
> **Pattern matches (scope analysis)** — other files and locations that use the same pattern/function/anti-pattern, with file:line references

### Phase 2 — Analyze & Post (main context)

Using the structured summary returned by the Haiku subagent, the main context performs the reasoning:

1. **Determine root cause** — analyze the code flow trace and git history to identify exactly what causes the bug
2. **Identify regression PRs** — determine which PRs introduced or surfaced the bug, and whether it is a new regression or pre-existing
3. **Assess scope of impact** — review the pattern matches to understand the full blast radius beyond the reported bug
4. **File separate bugs** — if other features are impacted by the same pattern/anti-pattern, file separate bug issues for each and link them
5. **Post the comment** — write and post a single comment on the issue with all findings

### Comment format

Post findings as a comment using:

```bash
gh issue comment <issue-number> --repo MetaMask/metamask-mobile --body "..."
```

The comment should include:

- **Summary** of the root cause
- **Likely Regression PR(s)** — PR numbers, titles, authors, and explanation of what changed (or note if pre-existing)
- **Error flow** with relevant file paths and line numbers
- **Full scope of impact** — all affected files, hooks, and components beyond the reported bug
- **Key files table** (file, line(s), description)
- **Suggested fix approach**
- **Links to related bugs** filed from the scope analysis
