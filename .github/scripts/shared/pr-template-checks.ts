// Pure semantic validators for the PR template, complementing the structural
// section-title check in `shared/template.ts`. Each validator returns a
// discriminated union so the calling script can aggregate every failure into a
// single sticky comment, instead of failing on the first miss.
//
// Source of truth for what "ready for review" requires:
// docs/readme/ready-for-review.md (DoRFR).

export type PrTemplateCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

const PR_TEMPLATE_SECTION_TITLES = {
  description: '## **Description**',
  changelog: '## **Changelog**',
  relatedIssues: '## **Related issues**',
  manualTesting: '## **Manual testing steps**',
  screenshots: '## **Screenshots/Recordings**',
  authorChecklist: '## **Pre-merge author checklist**',
  reviewerChecklist: '## **Pre-merge reviewer checklist**',
} as const;

export const PR_TEMPLATE_SECTIONS = PR_TEMPLATE_SECTION_TITLES;

const SCREENSHOTS_SUBHEADINGS = /^\s*###\s*\*\*(Before|After)\*\*\s*$/gim;

// Matches the verbatim Gherkin example shipped by the template. A real scenario
// or `N/A — <reason>` removes all of these tokens, so a single regex covers
// both "untouched template" and "partially edited but a slot was forgotten".
const MANUAL_TESTING_TEMPLATE_MARKERS =
  /Feature:\s*my feature name|\[(?:verb for user action|describe expected initial app state|describe expected outcome)\]/i;

// `Fixes:` / `Closes:` / `Refs:` on its own line, optionally wrapped in bold
// markers (the PR template uses `## **Related issues**`, contributors sometimes
// add `**Fixes:**`). The capture group holds whatever the author typed after
// the colon, which we then trim and check for non-emptiness. Any non-empty
// content counts as either a real reference or explicit rationale — we
// deliberately do not regex-parse GitHub / Jira refs to avoid false negatives.
const ISSUE_LINKAGE_LINE = /^\s*\**(?:Fixes|Closes|Refs)\**\s*:\s*(.*)$/im;

const UNCHECKED_CHECKBOX = /^\s*-\s*\[\s\]\s+(.*)$/m;

export function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Slice the body between `title` (a section heading from the PR template) and
 * the next `## **...**` heading. Returns `null` when the title is missing so
 * the caller can distinguish "section absent" (structural mismatch handled
 * elsewhere) from "section present but empty".
 */
export function extractSection(body: string, title: string): string | null {
  const sanitized = stripHtmlComments(body);
  const startIdx = sanitized.indexOf(title);
  if (startIdx === -1) {
    return null;
  }
  const afterTitle = sanitized.slice(startIdx + title.length);
  const nextHeadingMatch = afterTitle.match(/\n##\s+\*\*/);
  return nextHeadingMatch
    ? afterTitle.slice(0, nextHeadingMatch.index)
    : afterTitle;
}

export function hasNonEmptyDescription(
  descriptionSection: string,
): PrTemplateCheckResult {
  if (stripHtmlComments(descriptionSection).trim().length === 0) {
    return {
      ok: false,
      reason: '`Description` section is empty. Describe what changed and why.',
    };
  }
  return { ok: true };
}

export function hasValidIssueLink(
  relatedIssuesSection: string,
): PrTemplateCheckResult {
  const sanitized = stripHtmlComments(relatedIssuesSection);
  const match = sanitized.match(ISSUE_LINKAGE_LINE);
  const rationale = match?.[1]?.trim() ?? '';
  if (rationale.length === 0) {
    return {
      ok: false,
      reason:
        '`Related issues` section is empty. Add `Fixes: #123` / `Closes: <URL>` / `Refs: <Jira key>`, or write a short rationale after the colon.',
    };
  }
  return { ok: true };
}

export function hasRealManualTesting(
  manualTestingSection: string,
): PrTemplateCheckResult {
  const sanitized = stripHtmlComments(manualTestingSection).trim();
  if (sanitized.length === 0) {
    return {
      ok: false,
      reason:
        '`Manual testing steps` section is empty. Add real steps, or write `N/A — <reason>`.',
    };
  }
  if (MANUAL_TESTING_TEMPLATE_MARKERS.test(sanitized)) {
    return {
      ok: false,
      reason:
        '`Manual testing steps` still contain template content (the Gherkin example title or a `[...]` placeholder). Replace with real steps, or write `N/A — <reason>`.',
    };
  }
  return { ok: true };
}

export function hasScreenshotsOrNa(
  screenshotsSection: string,
): PrTemplateCheckResult {
  // Subheadings exist in every PR (they ship with the template); they don't
  // count as content. We trust the author for whether the content is
  // meaningful — CI only enforces "section was filled".
  const sanitized = stripHtmlComments(screenshotsSection)
    .replace(SCREENSHOTS_SUBHEADINGS, '')
    .trim();
  if (sanitized.length === 0) {
    return {
      ok: false,
      reason:
        '`Screenshots/Recordings` section is empty. Add an image/video for user-facing changes, or write `N/A` for non-user-facing changes.',
    };
  }
  return { ok: true };
}

export function hasAllAuthorChecklistChecked(
  checklistSection: string,
): PrTemplateCheckResult {
  const sanitized = stripHtmlComments(checklistSection);
  const firstUnchecked = sanitized.match(UNCHECKED_CHECKBOX);
  if (firstUnchecked) {
    const item = firstUnchecked[1].trim();
    return {
      ok: false,
      reason: `\`Pre-merge author checklist\` has unchecked items (e.g. "${item}"). Every box must be consciously checked — see \`docs/readme/ready-for-review.md\`.`,
    };
  }
  return { ok: true };
}

/**
 * Re-implements the legacy `hasChangelogEntry` from
 * `check-template-and-add-labels.ts` so the changelog rule lives next to the
 * other semantic validators. Behavior preserved: requires a non-empty value
 * after `CHANGELOG entry:`, allows the literal `null`, short-circuits when the
 * `no-changelog` label is set.
 */
export function hasChangelogEntry(
  body: string,
  hasNoChangelogLabel: boolean,
): PrTemplateCheckResult {
  if (hasNoChangelogLabel) {
    return { ok: true };
  }
  const lines = stripHtmlComments(body).split(/\r?\n/);
  const changelogLine = lines.find((line) =>
    line.trim().startsWith('CHANGELOG entry:'),
  );
  if (!changelogLine) {
    return {
      ok: false,
      reason:
        '`Changelog` section is missing the `CHANGELOG entry:` line. Add `CHANGELOG entry: <description>`, `CHANGELOG entry: null`, or apply the `no-changelog` label.',
    };
  }
  const match = changelogLine.match(/^\s*CHANGELOG entry:\s*(.*)$/);
  const entry = match?.[1]?.trim() ?? '';
  if (entry.length === 0) {
    return {
      ok: false,
      reason:
        '`Changelog` section has an empty `CHANGELOG entry:` line. Fill in a description, write `CHANGELOG entry: null`, or apply the `no-changelog` label.',
    };
  }
  return { ok: true };
}

/**
 * Run every semantic check against a PR body, given the no-changelog label
 * flag. Returns the list of failures (empty when the PR is materially
 * complete).
 */
export function runAllChecks(
  body: string,
  hasNoChangelogLabel: boolean,
): { ok: false; reason: string }[] {
  const results: PrTemplateCheckResult[] = [
    hasNonEmptyDescription(
      extractSection(body, PR_TEMPLATE_SECTION_TITLES.description) ?? '',
    ),
    hasChangelogEntry(body, hasNoChangelogLabel),
    hasValidIssueLink(
      extractSection(body, PR_TEMPLATE_SECTION_TITLES.relatedIssues) ?? '',
    ),
    hasRealManualTesting(
      extractSection(body, PR_TEMPLATE_SECTION_TITLES.manualTesting) ?? '',
    ),
    hasScreenshotsOrNa(
      extractSection(body, PR_TEMPLATE_SECTION_TITLES.screenshots) ?? '',
    ),
    hasAllAuthorChecklistChecked(
      extractSection(body, PR_TEMPLATE_SECTION_TITLES.authorChecklist) ?? '',
    ),
  ];
  return results.filter(
    (r): r is { ok: false; reason: string } => !r.ok,
  );
}
