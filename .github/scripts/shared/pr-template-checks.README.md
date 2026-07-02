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

## Metadata-driven validation (`mms-check` directives)

The set of sections to validate and which validator to apply is driven entirely
by `mms-check` directives embedded in `.github/pull-request-template.md`. No
code needs to change when sections are reordered or renamed, or when a new
plain-text section is added.

### Directive syntax

Directives are invisible HTML comments placed immediately after a section
heading in the template:

```markdown
## **Description**
<!-- mms-check: type=text required=true -->
```

Key-value pairs are space-separated. Supported keys:

| Key | Values | Description |
|---|---|---|
| `type` | see table below | Which validator to dispatch to |
| `required` | `true` \| `false` | Whether a failure blocks the PR check |

### Validator types

| `type` value | Validator called |
|---|---|
| `text` | `hasNonEmptyDescription` |
| `changelog` | `hasChangelogEntry` |
| `issue-link` | `hasValidIssueLink` |
| `manual-testing` | `hasRealManualTesting` |
| `screenshot` | `hasScreenshotsOrNa` |
| `checklist` | `hasAllAuthorChecklistChecked` |

Sections with **no** directive are checked for structural presence only (heading
must exist in the PR body) but receive no semantic validator. The reviewer
checklist uses this mode intentionally.

### Safety at startup

At module load, every directive `type` in the plan is validated against the
`VALIDATORS` registry. A typo or unknown type causes the module to throw
immediately rather than silently skipping the check in CI.

### Trust model

Directives are read from the **base-branch** copy of the template (the workflow
uses `pull_request_target` without a `ref:` override, so the checkout always
reflects the base branch). A PR author cannot weaken validation by modifying
or removing directives in their branch.

HTML comments in the **PR body** — including any `mms-check` directives that
GitHub copies from the template when the PR is opened — are entirely ignored by
`extractSection`. They are filtered out before the section content reaches any
validator. An author who deletes every HTML comment from their PR description
has no effect on what is checked or how.

### Helper exports for testing

```typescript
import { parseDirective, buildValidationPlan, validatePlanTypes } from './pr-template-checks';
```

- **`parseDirective(commentContent)`** — parse one `mms-check:` comment body
  into a `Record<string, string>`, or return `null` if not a directive.
- **`buildValidationPlan(tokens)`** — walk a token array and return the ordered
  list of `{ title, type, required }` entries.
- **`validatePlanTypes(plan, validators)`** — throw if any plan entry's `type`
  is absent from the validators map. Useful in tests without reloading the module.

## Adding a new validator

1. Add the `mms-check: type=<new-type> required=true` directive to the relevant
   section in `.github/pull-request-template.md`.
2. Write a pure validator function `(section: string) => PrTemplateCheckResult`.
   Use `tokenize` + token filtering when injection-safety matters (see
   `markdown-tokenizer.README.md`). Use `stripHtmlComments` for simpler
   string-level checks.
3. Add the new type key and function to the `VALIDATORS` registry.
4. Add test cases in `pr-template-checks.test.ts` covering pass, fail, and at
   least one fenced-block injection case if relevant.
