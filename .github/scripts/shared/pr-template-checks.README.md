# pr-template-checks

Pure semantic validators for the MetaMask Mobile PR template. Each function
returns a discriminated union (`{ ok: true }` / `{ ok: false; reason: string }`)
so the calling script can aggregate all failures into a single sticky comment
rather than exiting on the first miss.

## Relationship to other modules

| Module | Responsibility |
|---|---|
| `shared/template.ts` | Structural check — are all section headings present? |
| `pr-template-checks.ts` | Semantic checks — is the content meaningful? |
| `markdown-tokenizer.ts` | Parsing primitive used by the validators |
| `check-template-and-add-labels.ts` | Orchestrator — calls `runAllChecks`, posts the sticky comment |

The structural check runs first. Semantic checks only run when the template
structure is intact (all section headings found).

## Validators

### `hasNonEmptyDescription(section)`

Passes when the `Description` section contains any author-written text after
stripping HTML comments.

### `hasChangelogEntry(body, hasNoChangelogLabel)`

Passes when:
- the `no-changelog` label is applied, **or**
- a `CHANGELOG entry: <non-empty value>` line exists outside of any fenced code
  block (so a Gherkin example containing `CHANGELOG entry:` does not count).

### `hasValidIssueLink(section)`

Passes when the `Related issues` section contains at least one `Fixes:` /
`Closes:` / `Refs:` line with a non-empty value outside of any fenced code
block. Any text after the colon qualifies (GitHub ref, Jira key, URL, or a
plain rationale).

### `hasRealManualTesting(section)`

Passes when the `Manual testing steps` section contains either:
- a filled-in Gherkin block (none of the template placeholder tokens remain), or
- an explicit `N/A — <reason>` statement.

### `hasScreenshotsOrNa(section)`

Passes when the `Screenshots/Recordings` section contains any content beyond
the `### Before` / `### After` sub-headings that ship with the template.

### `hasAllAuthorChecklistChecked(section)`

Passes when every checkbox in the `Pre-merge author checklist` section is
checked (`[x]`). Checkboxes inside fenced code blocks are ignored — they are
treated as examples, not real checklist items.

## Helper exports

### `extractSection(body, title)`

Slices the PR body between a section heading and the next heading of equal or
higher level. Returns `null` when the heading is absent (structural mismatch,
handled by the template check). HTML comments are stripped from the returned
string; fenced code content is preserved raw so that `hasRealManualTesting` can
inspect it.

### `stripHtmlComments(text)`

Removes `<!-- … -->` comments from a string while leaving `<!--` inside fenced
code blocks untouched. Unclosed openers outside code fences are consumed (not
left in the output) to prevent unfilled template placeholders from passing
content checks.

### `runAllChecks(body, hasNoChangelogLabel)`

Runs every validator in sequence and returns only the failures. The empty array
means the PR is materially complete.

```typescript
import { runAllChecks } from './pr-template-checks';

const failures = runAllChecks(prBody, hasNoChangelogLabel);
if (failures.length > 0) {
  // surface failures.map(f => f.reason)
}
```

## Adding a new validator

1. Write a pure function `(section: string) => PrTemplateCheckResult`.
2. Use `tokenize` + token filtering when the check must be injection-safe (see
   `markdown-tokenizer.README.md`). Use `stripHtmlComments` for simpler
   string-level checks.
3. Register the new validator inside `runAllChecks`.
4. Add test cases in `pr-template-checks.test.ts` covering pass, fail, and at
   least one fenced-block injection case if relevant.
