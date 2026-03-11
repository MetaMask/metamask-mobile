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

7. **Assemble output** -- read `.github/pull-request-template.md` for the full template body, then fill all sections

## Template Sections

CI validates that all 7 section titles are present **exactly** as written below (`.github/scripts/shared/template.ts`). Missing or altered titles cause the `invalid-pull-request-template` label.

| Section title (exact string)          | Guidance                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `## **Description**`                  | Concise what/why. Keep HTML comments from template as-is.                                                                 |
| `## **Changelog**`                    | `CHANGELOG entry: <past-tense summary>` or `CHANGELOG entry: null`. Line must exist and be non-empty -- CI enforces this. |
| `## **Related issues**`               | `Fixes: #NUMBER` or `Refs: #NUMBER`. Leave `Fixes:` empty if none found.                                                  |
| `## **Manual testing steps**`         | Gherkin code block.                                                                                                       |
| `## **Screenshots/Recordings**`       | Keep Before/After subsections with placeholder comments.                                                                  |
| `## **Pre-merge author checklist**`   | Include all checklist items from the template.                                                                            |
| `## **Pre-merge reviewer checklist**` | Include all checklist items from the template.                                                                            |

## Output

Write the result to `.agent/[branch-name].PR-desc.md`. Create the `.agent/` directory if it does not exist.

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
