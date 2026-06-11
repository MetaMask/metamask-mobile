// Pure semantic validators for the PR template, complementing the structural
// section-title check in `shared/template.ts`. Each validator returns a
// discriminated union so the calling script can aggregate every failure into a
// single sticky comment, instead of failing on the first miss.
//
// Source of truth for what "ready for review" requires:
// docs/readme/ready-for-review.md (DoRFR).

import * as fs from 'fs';
import * as path from 'path';
import { tokenize, sectionTokens, Token } from './markdown-tokenizer';

// ─── Result types ─────────────────────────────────────────────────────────────

// Returned by individual validators — no knowledge of the blocking flag, which
// is a plan-level concern stamped by runAllChecks.
type ValidatorResult =
  | { ok: true }
  | { ok: false; reason: string };

// Returned by runAllChecks — adds the blocking flag from the plan entry.
export type PrTemplateCheckResult =
  | { ok: true }
  | { ok: false; reason: string; blocking: boolean };

// ─── Validation-plan types ───────────────────────────────────────────────────

interface ValidationPlanEntry {
  // Raw heading string that identifies the section (e.g. '## **Description**').
  title: string;
  // Validator type key, must exist in VALIDATORS or module load throws.
  type: string;
  required: boolean;
  // Whether a failure of this check fails the workflow. Default: false.
  blocking: boolean;
}

type ValidatorContext = { hasNoChangelogLabel: boolean };
type Validator = (section: string, ctx: ValidatorContext) => ValidatorResult;

// ─── Template loading (single read at module load) ───────────────────────────

const TEMPLATE_PATH = path.join(__dirname, '../../pull-request-template.md');

// Read once against the base-branch template (the workflow uses
// pull_request_target without a ref override, so the checkout always reflects
// the base branch, not the PR head — see check-template-and-add-labels.yml).
const templateTokens = tokenize(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

// Every level-2 heading in the template (including the reviewer checklist) —
// used by template.ts for structural presence checking.
export const PR_TEMPLATE_SECTION_TITLES: string[] = templateTokens
  .filter((t) => t.kind === 'heading' && t.level === 2)
  .map((t) => t.raw);

// Backward-compatible alias (template.ts consumes this directly as an array).
export const PR_TEMPLATE_SECTIONS = PR_TEMPLATE_SECTION_TITLES;

// ─── Directive parsing ───────────────────────────────────────────────────────

/**
 * Parse `key=value` pairs from an `mms-check` HTML-comment body.
 * Returns `null` when the content does not start with `mms-check:`.
 */
export function parseDirective(commentContent: string): Record<string, string> | null {
  const trimmed = commentContent.trim();
  if (!trimmed.startsWith('mms-check:')) return null;
  const pairs = trimmed.slice('mms-check:'.length).trim();
  const result: Record<string, string> = {};
  for (const pair of pairs.split(/\s+/)) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    result[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
  }
  return result;
}

/**
 * Walk template tokens and build the ordered validation plan.
 * The first `mms-check` html_comment found in each level-2 section produces
 * one plan entry. Sections with no directive are structural-only (no semantic
 * validator is dispatched for them).
 */
export function buildValidationPlan(tokens: Token[]): ValidationPlanEntry[] {
  const plan: ValidationPlanEntry[] = [];
  let currentHeading: string | null = null;
  let directiveFoundForCurrent = false;

  for (const token of tokens) {
    if (token.kind === 'heading' && token.level === 2) {
      currentHeading = token.raw;
      directiveFoundForCurrent = false;
    } else if (
      token.kind === 'html_comment' &&
      currentHeading !== null &&
      !directiveFoundForCurrent
    ) {
      const directive = parseDirective(token.content);
        if (directive?.type) {
          plan.push({
            title: currentHeading,
            type: directive.type,
            // Any value other than the explicit string "false" means required.
            required: directive.required !== 'false',
            // Only the explicit string "true" makes a check blocking; default is false.
            blocking: directive.blocking === 'true',
          });
        directiveFoundForCurrent = true;
      }
    }
  }

  return plan;
}

const VALIDATION_PLAN = buildValidationPlan(templateTokens);

// ─── Validator registry ───────────────────────────────────────────────────────

// Wraps the existing pure validators in a uniform signature so runAllChecks
// can dispatch each section without knowing which validator to call.
const VALIDATORS: Record<string, Validator> = {
  text:             (s) => hasNonEmptyDescription(s),
  changelog:        (s, ctx) => hasChangelogEntry(s, ctx.hasNoChangelogLabel),
  'issue-link':     (s) => hasValidIssueLink(s),
  'manual-testing': (s) => hasRealManualTesting(s),
  screenshot:       (s) => hasScreenshotsOrNa(s),
  checklist:        (s) => hasAllAuthorChecklistChecked(s),
};

/**
 * Validate that every plan entry's `type` is present in `validators`.
 * Exported so tests can call it with an arbitrary plan without reloading
 * the module.
 */
export function validatePlanTypes(
  plan: ValidationPlanEntry[],
  validators: Record<string, unknown>,
): void {
  for (const entry of plan) {
    if (!validators[entry.type]) {
      throw new Error(
        `Unknown mms-check type "${entry.type}" in section "${entry.title}". ` +
        `Add a VALIDATORS entry for this type or fix the directive in pull-request-template.md.`,
      );
    }
  }
}

// Fail loudly at module load if the template contains an unrecognised type,
// so a directive typo surfaces as a hard CI failure rather than a silent skip.
validatePlanTypes(VALIDATION_PLAN, VALIDATORS);

// ─── Shared regexes ──────────────────────────────────────────────────────────

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

// ─── Checklist item count ────────────────────────────────────────────────────

// Derived from the plan entry whose type is "checklist", so it automatically
// stays in sync with the template without any hardcoded constant.
const checklistPlanEntry = VALIDATION_PLAN.find((e) => e.type === 'checklist');
const AUTHOR_CHECKLIST_MIN_ITEMS: number = (() => {
  if (!checklistPlanEntry) return 0;
  const section = sectionTokens(templateTokens, checklistPlanEntry.title);
  return section ? section.filter((t) => t.kind === 'checkbox').length : 0;
})();

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

export function hasNonEmptyDescription(
  descriptionSection: string,
): ValidatorResult {
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
): ValidatorResult {
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
): ValidatorResult {
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
): ValidatorResult {
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
): ValidatorResult {
  // Use only checkbox tokens — checkboxes that appear inside fenced code
  // blocks are examples or docs, not real checklist items.
  const checkboxes = tokenize(checklistSection).filter(
    (t) => t.kind === 'checkbox',
  );

  // Per docs/readme/ready-for-review.md, every item must be consciously
  // assessed — deleting rows is not a valid alternative to checking them.
  // Enforce a minimum count equal to the template's item count so an author
  // cannot bypass the requirement by removing unchecked rows.
  if (checkboxes.length < AUTHOR_CHECKLIST_MIN_ITEMS) {
    return {
      ok: false,
      reason: `\`Pre-merge author checklist\` has only ${checkboxes.length} of the required ${AUTHOR_CHECKLIST_MIN_ITEMS} items. Every checklist row must be present and consciously checked — do not delete rows.`,
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
 *
 * Accepts the pre-extracted Changelog section string (not the full PR body)
 * so that a `CHANGELOG entry:` line placed in any other section (e.g.
 * Description or Screenshots) cannot satisfy this check.
 */
export function hasChangelogEntry(
  changelogSection: string,
  hasNoChangelogLabel: boolean,
): ValidatorResult {
  if (hasNoChangelogLabel) {
    return { ok: true };
  }
  // Search only in plain text tokens — a CHANGELOG entry inside a fenced code
  // block is a doc example, not the real entry the CI check requires.
  const changelogLine = tokenize(changelogSection)
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

// ─── runAllChecks (config-driven loop) ───────────────────────────────────────

/**
 * Run every required semantic check against a PR body.
 * The validation plan is derived from the base-branch template at module load,
 * so the set of checks always matches the template — no code change is needed
 * when sections are reordered, renamed, or when a plain-text section is added.
 *
 * Returns the list of failures (empty when the PR is materially complete).
 */
export function runAllChecks(
  body: string,
  hasNoChangelogLabel: boolean,
): { ok: false; reason: string; blocking: boolean }[] {
  const ctx = { hasNoChangelogLabel };
  const failures: { ok: false; reason: string; blocking: boolean }[] = [];
  for (const entry of VALIDATION_PLAN) {
    if (!entry.required) continue;
    const section = extractSection(body, entry.title) ?? '';
    const result = VALIDATORS[entry.type](section, ctx);
    if (!result.ok) failures.push({ ...result, blocking: entry.blocking });
  }
  return failures;
}
