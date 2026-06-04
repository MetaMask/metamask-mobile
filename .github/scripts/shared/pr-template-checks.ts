// Pure semantic validators for the PR template, complementing the structural
// section-title check in `shared/template.ts`. Each validator returns a
// discriminated union so the calling script can aggregate every failure into a
// single sticky comment, instead of failing on the first miss.
//
// Source of truth for what "ready for review" requires:
// docs/readme/ready-for-review.md (DoRFR).

import { tokenize, sectionTokens } from './markdown-tokenizer';

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
// The `g` flag is required for `matchAll` so every line is checked, not just
// the first — the template ships with a blank `Fixes:` that would otherwise
// shadow a valid `Refs:` added on a subsequent line.
// `[ \t]*` (not `\s*`) after the colon prevents the match from crossing a
// line boundary and accidentally capturing the next line as the rationale.
const ISSUE_LINKAGE_LINE = /^[ \t]*\**(?:Fixes|Closes|Refs)\**[ \t]*:[ \t]*(.*)$/gim;


/**
 * Identify character ranges occupied by fenced code blocks (``` or ~~~).
 * `<!--` delimiters inside these ranges are literal text and must not be
 * treated as HTML comment openers — otherwise a single unclosed `<!--` in a
 * code example drops everything that follows it, producing false "section
 * empty" failures on a valid PR body.
 */
function computeFencedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const lines = text.split('\n');
  let offset = 0;
  let fenceStart = -1;
  let fenceChar = '';
  let fenceLen = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, ''); // normalise Windows line endings
    const lineEnd = offset + rawLine.length + 1; // +1 for the \n removed by split

    const match = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (match) {
      const char = match[1][0];
      const len = match[1].length;
      if (fenceStart === -1) {
        fenceStart = offset;
        fenceChar = char;
        fenceLen = len;
      } else if (char === fenceChar && len >= fenceLen) {
        ranges.push([fenceStart, lineEnd]);
        fenceStart = -1;
        fenceChar = '';
        fenceLen = 0;
      }
    }

    offset = lineEnd;
  }

  return ranges;
}

export function stripHtmlComments(text: string): string {
  // Pre-compute fenced code block ranges so that `<!--` inside a code example
  // is treated as literal text, not a comment opener.
  //
  // Index-based removal avoids regex on the `<!--` delimiter, which CodeQL
  // flags as "incomplete multi-character sanitization". Walking forward by
  // character index guarantees every opener is paired with the next closer,
  // and unclosed openers outside code fences are consumed rather than left in
  // the output.
  const fencedRanges = computeFencedRanges(text);
  const inFence = (idx: number): boolean =>
    fencedRanges.some(([s, e]) => idx >= s && idx < e);

  let result = '';
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf('<!--', cursor);
    if (open === -1) {
      result += text.slice(cursor);
      break;
    }
    if (inFence(open)) {
      // Literal code — copy the opener as-is and keep scanning.
      result += text.slice(cursor, open + 4);
      cursor = open + 4;
      continue;
    }
    result += text.slice(cursor, open);
    const close = text.indexOf('-->', open + 4);
    if (close === -1) {
      break; // unclosed comment outside a code fence — drop the rest
    }
    cursor = close + 3;
  }
  return result;
}

/**
 * Slice the body between `title` (a section heading from the PR template) and
 * the next heading of the same or higher level. Returns `null` when the title
 * is missing so the caller can distinguish "section absent" (structural
 * mismatch handled elsewhere) from "section present but empty".
 *
 * Uses the tokenizer so that a heading inside a fenced code block is never
 * mistaken for a real section boundary or the section title itself.
 */
export function extractSection(body: string, title: string): string | null {
  const section = sectionTokens(tokenize(body), title);
  if (section === null) return null;
  // Reconstruct as a plain string, excluding HTML comments (they are
  // placeholder instructions, not author content). Fenced code block content
  // is preserved (raw, with fence markers) so that validators such as
  // hasRealManualTesting can inspect Gherkin examples.
  return section
    .filter((t) => t.kind !== 'html_comment')
    .map((t) => t.raw)
    .join('\n');
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
  // Search only in plain text tokens — a Fixes/Closes/Refs line inside a
  // fenced code block (e.g. a doc example) must not count as the real link.
  const textOutsideFences = tokenize(relatedIssuesSection)
    .filter((t) => t.kind === 'text')
    .map((t) => t.content)
    .join('\n');
  // Check every line: at least one must carry a non-empty value. The template
  // ships a blank `Fixes:` placeholder — matchAll prevents that from shadowing
  // a valid `Refs:` added on a subsequent line.
  const hasValidLink = [...textOutsideFences.matchAll(ISSUE_LINKAGE_LINE)].some(
    (m) => (m[1]?.trim() ?? '').length > 0,
  );
  if (!hasValidLink) {
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
        '`Screenshots/Recordings` section is empty. Add an image/video for user-facing changes, logs/console output for non-user-facing changes, or write `N/A` if no evidence is applicable.',
    };
  }
  return { ok: true };
}

export function hasAllAuthorChecklistChecked(
  checklistSection: string,
): PrTemplateCheckResult {
  // Use only checkbox tokens — checkboxes that appear inside fenced code
  // blocks are examples or docs, not real checklist items.
  const checkboxes = tokenize(checklistSection).filter(
    (t) => t.kind === 'checkbox',
  );

  // A section where all rows were deleted (or only the heading remains) has
  // no checkbox tokens at all.
  if (checkboxes.length === 0) {
    return {
      ok: false,
      reason:
        '`Pre-merge author checklist` has no checked items. Complete every checklist item before marking the PR as ready for review.',
    };
  }

  const firstUnchecked = checkboxes.find((t) => !t.checked);
  if (firstUnchecked) {
    return {
      ok: false,
      reason: `\`Pre-merge author checklist\` has unchecked items (e.g. "${firstUnchecked.content}"). Every box must be consciously checked — see \`docs/readme/ready-for-review.md\`.`,
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
  // Search only in plain text tokens — a CHANGELOG entry inside a fenced code
  // block is a doc example, not the real entry the CI check requires.
  const changelogLine = tokenize(body)
    .filter((t) => t.kind === 'text')
    .map((t) => t.content)
    .find((line) => line.trim().startsWith('CHANGELOG entry:'));
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
