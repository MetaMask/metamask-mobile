# Create Bug Report

Create a GitHub issue for MetaMask Mobile using the official bug report template.

## Overview

This skill collects all required information from the user and creates a properly formatted GitHub issue against the `MetaMask/metamask-mobile` repository following the `.github/ISSUE_TEMPLATE/bug-report.yml` template.

## Prerequisites

- `gh` CLI must be installed and authenticated (`gh auth status`)
- If not authenticated, prompt the user to run `gh auth login` in their terminal

## Interactive Information Gathering

**Before creating the issue, collect the following from the user. Ask for any missing fields — do not create the issue until all required fields are provided.**

### Required Fields

1. **Describe the bug**
   - Prompt: "Describe the bug — what happened?"
   - A clear and concise description of the issue

2. **Steps to reproduce**
   - Prompt: "What are the steps to reproduce the issue?"
   - Numbered list of steps

3. **Where was this bug found?**
   - Prompt: "Where was this found — 'Live version (from official store)' or 'Internal release testing'?"
   - Must be one of these two options exactly

4. **Version**
   - Prompt: "What version of MetaMask? (found in Settings > About MetaMask, e.g. 7.67.0)"

5. **Build number**
   - Prompt: "What build number? (found in Settings > About MetaMask, e.g. 3764)"

6. **Device**
   - Prompt: "What device was this seen on? (brand and model, e.g. Samsung Galaxy A42, iPhone 15 Pro)"

7. **Operating system**
   - Prompt: "Which operating system — iOS, Android, both, or Other? (if Other, please elaborate and note it in Additional Context)"
   - Supports multi-select; valid values: iOS, Android, Other

### Optional Fields

8. **Expected behavior** — What should have happened?
9. **Screenshots/Recordings** — Any visual evidence?
10. **Error messages or log output** — Any relevant error text or logs?
11. **Build type** — Beta, Flask, or standard (use "_No response_" if standard — section must always be present)
12. **Additional context** — Any other relevant details?

## Create the GitHub Issue

Once all required fields are collected, create the issue using:

```bash
gh issue create \
  --repo MetaMask/metamask-mobile \
  --title "[Bug]: <concise description>" \
  --label "type-bug" \
  --body "..."
```

### Title Format

- Always prefix with `[Bug]: `
- Keep it concise and descriptive

### Label

- Always use `type-bug`

### Body Template

Format the body exactly as follows, using the information collected:

```markdown
### Describe the bug

<description>

### Expected behavior

<expected behavior, or "_No response_" if not provided>

### Screenshots/Recordings

<screenshots/recordings, or "_No response_" if not provided>

### Steps to reproduce

<numbered steps>

### Error messages or log output
```

<error output, or leave empty if not provided>

```

### Where was this bug found?

<Live version (from official store) | Internal release testing>

### Version

<version>

### Build number

<build number>

### Build type

<Beta | Flask | Other (standard build) | _No response_ if standard>

### Device

<device>

### Operating system

<iOS | Android | iOS and Android | Other (please elaborate in the "Additional Context" section)>

### Additional context

<additional context, or "_No response_" if not provided>

### Severity

_To be added after bug submission by internal support / PM:_
```

## After Creation

- Output the issue URL so the user can view it
- Ask if they would like to investigate the code related to the bug
