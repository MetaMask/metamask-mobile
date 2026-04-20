# Definition of Ready For Review (DoRFR)

This document is the single source of truth for what `ready for review` means in
MetaMask Mobile. Any other document, contributor rule, AI skill, or automation
that uses the phrase `ready for review` must align with this definition.

When something else (a PR template comment, a Cursor rule, or a PR-related AI
skill) appears to define `ready for review` differently, this document wins and
the other location should be updated to match.

## Why This Definition Exists

Contributors need one unambiguous definition of `ready for review` so the PR
template, contributor guidance, AI skills, and automation all point to the same
expectation.

Without a canonical definition, a PR can look structurally complete while still
being materially incomplete, for example when:

- the related issue is missing or not properly linked,
- the manual testing section still contains placeholder content,
- checklist checkboxes are left unchecked,
- screenshots or recordings are missing when applicable.

This weak definition lets authors move a PR out of draft before author-owned
work is finished. Reviewers then spend time reviewing a PR that still needs lint
fixes, test fixes, template cleanup, or other changes that should have been done
before review started. Those later commits can dismiss approvals and force
reviewers to re-review unrelated changes.

This definition of `ready for review` removes the ambiguity.
It makes author expectations explicit, keeps human guidance and automation aligned,
and sets the standard that future readiness checks must enforce.

`Ready for review` means the PR is fully prepared, all checks are currently
passing, and the only expected follow-up commits are reviewer-driven.

## What `Ready For Review` Means

A PR is ready for review only when **all** of the following are true.

### The author has manually tested the change

The author must have personally verified that the change works as intended
before requesting review. Asking reviewers to be the first to discover that
the change does not work wastes review cycles.

### The PR template is materially complete

Materially complete means more than "the section headings are present". It
means:

- **Description**: describes what changed and why, not a placeholder.
- **Changelog**: contains a valid `CHANGELOG entry:` line, or the PR has the
  `no-changelog` label or `CHANGELOG entry: null`. The changelog must be a real
  statement, not leftover template text.
- **Related issues**: links a real issue with a keyword such as `Fixes:`,
  `Closes:`, or `Refs:`, or explicitly states the rationale for why no issue is
  linked. `Fixes:` left empty is not acceptable.
  Issue can be a GitHub or a Jira link.
- **Manual testing steps**: contains real steps, or an explicit `N/A` with a
  short reason. The stock Gherkin example from the template is not a real
  manual testing section.
  - **Why**: reviewers who do not have context on the change need to test it
    with minimal effort. Consider the reviewer as completely new to the topic.
  - **Format**: Gherkin, so that testing steps are consistent across PRs.
  - **Content**: include any required setup or preconditions, then provide
    clear step-by-step instructions with no implied steps.
- **Screenshots / Recordings**: contains actual evidence when the change is
  user-facing, or an explicit `N/A` when it is not. An empty `Before` / `After`
  section is ambiguous and is not considered complete.
  When the change is only visible in terminal logs or CI output, a screenshot
  or recording of those logs should be provided.
- **Author checklist**: every item in the pre-merge author checklist is
  explicitly resolved. See the checklist semantics below.

### All checks are currently passing

Checks must be green **right now** when the PR is moved to ready for review, not
merely "green at some earlier point". If a check is red or pending, the PR is
not ready.

If follow-up commits cause previously green checks to go red, the author should
move the PR back to draft until the checks are green again.

### The only expected follow-up commits are reviewer-driven

Lint fixes, failing tests, unresolved template placeholders, missing
screenshots, or any other author-owned cleanup must be done **before** the PR is
marked ready for review. Pushing those fixes after requesting review is what
causes approvals to be dismissed and forces reviewers to re-review unrelated
changes.

If the author still expects to push non-reviewer-driven commits, the PR is not
ready for review yet. It should stay in draft.

### The PR is assigned

The PR must be assigned to the person responsible for moving it to merge,
usually the author.

### Required labels are in place

The PR must have a `team-*` label (or `external-contributor` for non-MetaMask
contributors, applied by a maintainer during triage).

Merge-blocking labels should normally be cleared before marking a PR as ready
for review. Exception: a blocking label may remain when the PR is ready to be
reviewed but must not be merged yet because it depends on another PR merging
first. In that case, the `DO-NOT-MERGE` label prevents premature merge, not review.

See `.github/guidelines/LABELING_GUIDELINES.md`.

## Checklist Semantics

The PR template contains both an author checklist and a reviewer checklist.
These checklists are not busywork. They exist to remove ambiguity about whether
each responsibility was considered.

### A checklist is not a list of "already done" items

Checklists are not a list where unchecked boxes mean "not done" or
"not applicable and ignored".
A checklist is complete only when every item has been considered explicitly.

### Checking a box means action was considered

- A checked box means the person filling the checklist **consciously assessed**
  that responsibility.
- A checked box is **not** proof that a specific action happened. For example,
  checking "I've included tests if applicable" when tests are not applicable is
  still valid, as long as the author has actively decided that tests are not
  applicable.
- The checked state should reflect the outcome of that conscious assessment,
  including "considered and not applicable".

### Unchecked boxes are ambiguous

- An unchecked box does not mean "skipped" and does not mean "not applicable".
- Leaving a box unchecked creates ambiguity that must be removed before review
  starts.
- An unchecked box in the author checklist is a signal that the author has not
  yet made a decision about that item.

### Checklist guidelines applies to both author and reviewer

The same philosophy applies to the reviewer checklist. An unchecked reviewer
box is equally ambiguous.
Each item must be consciously assessed, not silently ignored.

## Relationship With Draft State

- PRs start in draft.
- The **author** moves the PR out of draft. This is the explicit signal that
  the PR now meets this Definition of Ready For Review.
- If the PR does not meet this definition, it must stay in draft, or be moved
  back to draft until it does.

## When a PR Does Not Meet This Definition

If a reviewer finds that a non-draft PR does not meet this definition, the
reviewer should leave a comment explaining which criteria are not met. After
discussion, the author decides whether to move the PR back to draft and is
responsible for addressing the gaps before marking it ready for review again.

## Relationship With CI Automation

Some automation may validate parts of this definition, but this document remains
the source of truth for what `ready for review` means in this repository.
