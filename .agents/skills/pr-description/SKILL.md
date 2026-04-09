---
name: pr-description
description: Generate a complete pull request description following the MetaMask Mobile PR template. Use when the user asks to generate a PR description, fill the PR template, or create a pull request body.
---

# PR Description

## Workflow

1. **Collect context**

   ```bash
   git rev-parse --abbrev-ref HEAD
   git diff main...HEAD
   git log main..HEAD --oneline
   ```

2. **Generate a PR title** in conventional commit format (see `pr-title` skill if available)

3. **Find related GitHub issues** from branch name, commit messages, or keyword search (see `pr-issue-search` skill if available)

4. **Write description** -- analyze the diff to answer: (1) what is the reason for the change? (2) what is the improvement/solution?

5. **Generate a changelog entry** for the PR (see `pr-changelog` skill if available)

6. **Generate Gherkin manual testing steps** for the changed features (see `pr-manual-testing` skill if available)

7. **Verify author checklist items** -- run the `pr-readiness-check` skill (if available) to warn about missing tests, missing JSDoc, or guideline violations. Do not block — continue generating the description regardless of findings.

8. **Assemble output** -- read `.github/pull-request-template.md` for the full template body, then fill all sections

## Template Sections

CI validates that all 7 section titles are present **exactly** as written below (`.github/scripts/shared/template.ts`). Missing or altered titles cause the `invalid-pull-request-template` label.

| Section title (exact string)          | Guidance                                                                                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `## **Description**`                  | Concise what/why. Keep HTML comments from template as-is.                                                                                                                                           |
| `## **Changelog**`                    | `CHANGELOG entry: <past-tense summary>` or `CHANGELOG entry: null`. Line must exist and be non-empty -- CI enforces this.                                                                           |
| `## **Related issues**`               | `Fixes: #NUMBER` or `Refs: #NUMBER`. Leave `Fixes:` empty if none found.                                                                                                                            |
| `## **Manual testing steps**`         | Gherkin code block. If no useful manual test exists (e.g. automation-only, unit tests suffice), write `N/A`.                                                                                        |
| `## **Screenshots/Recordings**`       | Keep Before/After subsections. Write `N/A` in each subsection when not applicable instead of HTML comments.                                                                                         |
| `## **Pre-merge author checklist**`   | Include all checklist items from the template. **Check all boxes** (`- [x]`): checking means the author actively considered the item and takes responsibility, even if it doesn't apply to this PR. |
| `## **Pre-merge reviewer checklist**` | Include all checklist items from the template. Leave boxes unchecked — these are for the reviewer.                                                                                                  |

## Output

Write the result to `.agent/[branch-name].PR-desc.md`. Create the `.agent/` directory if it does not exist. Sanitize the branch name first by replacing `/` with `-` so names like `feat/MCWP-392` become `feat-MCWP-392` (avoids creating nested directories).

Structure:

```markdown
# PR Title

<generated title>

---

<full PR description body with all 7 sections, HTML comments, and checklists>
```

Preserve all HTML comments from the original template as guidance for the PR author.

Append at the very end of the file:

```markdown
<!-- Generated with the help of the pr-description AI skill -->
```
