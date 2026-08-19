import {
  buildValidationPlan,
  extractSection,
  hasAllAuthorChecklistChecked,
  hasChangelogEntry,
  hasNonEmptyDescription,
  hasRealManualTesting,
  hasScreenshotsOrNa,
  hasValidIssueLink,
  parseDirective,
  runAllChecks,
  stripHtmlComments,
  validatePlanTypes,
} from './pr-template-checks';
import { tokenize } from './markdown-tokenizer';

const fullValidBody = `
## **Description**

Real description of what changed and why.

## **Changelog**

CHANGELOG entry: Added a real feature.

## **Related issues**

Fixes: #1234

## **Manual testing steps**

\`\`\`gherkin
Feature: ready-for-review CI checks

  Scenario: user opens the PR template
    Given the author starts a new PR
    When user fills the manual testing section
    Then the validator passes
\`\`\`

## **Screenshots/Recordings**

### **Before**

N/A

### **After**

N/A

## **Pre-merge author checklist**

- [x] Followed contributor docs
- [x] Completed PR template
- [x] Included tests if applicable
- [x] Documented code with JSDoc if applicable
- [x] Applied right labels

#### Performance checks (if applicable)

- [x] Tested on Android
- [x] Tested with power user scenario
- [x] Instrumented with Sentry traces if applicable

## **Pre-merge reviewer checklist**

- [ ] Reviewer item (intentionally unchecked: reviewer fills this later)
`.trim();

describe('stripHtmlComments', () => {
  it('removes single-line comments', () => {
    expect(stripHtmlComments('a <!-- hide --> b')).toBe('a  b');
  });

  it('removes multi-line comments', () => {
    expect(stripHtmlComments('a\n<!--\nmulti\nline\n-->b')).toBe('a\nb');
  });

  it('leaves non-comment content untouched', () => {
    expect(stripHtmlComments('no comments here')).toBe('no comments here');
  });

  it('consumes everything from an unclosed opener to end of string', () => {
    expect(stripHtmlComments('a <!-- unclosed')).toBe('a ');
  });

  it('preserves content after a fenced block whose interior contains an unclosed <!--', () => {
    const body =
      '## **Description**\n\nSome text\n\n```html\n<!-- unclosed\n```\n\n## **Changelog**\n\nCHANGELOG entry: fix';
    expect(stripHtmlComments(body)).toContain('CHANGELOG entry: fix');
  });

  it('does not strip content that looks like an HTML comment inside a fenced block', () => {
    const body = 'before\n```html\n<!-- comment -->\n```\nafter';
    expect(stripHtmlComments(body)).toContain('<!-- comment -->');
    expect(stripHtmlComments(body)).toContain('after');
  });

  it('still strips real HTML comments that appear outside fenced blocks', () => {
    const body = 'before\n<!-- strip this -->\nafter\n```html\n<!-- keep this -->\n```\nend';
    const result = stripHtmlComments(body);
    expect(result).not.toContain('strip this');
    expect(result).toContain('<!-- keep this -->');
    expect(result).toContain('end');
  });
});

describe('extractSection', () => {
  it('returns content between the title and the next `## **` heading', () => {
    const section = extractSection(fullValidBody, '## **Description**');
    expect(section).not.toBeNull();
    expect(section).toContain('Real description');
    expect(section).not.toContain('## **Changelog**');
  });

  it('returns null when the title is missing', () => {
    expect(extractSection('# no sections here', '## **Description**')).toBeNull();
  });

  it('ignores titles that appear inside HTML comments', () => {
    const body = '<!-- ## **Description** -->\n## **Changelog**\n\nCHANGELOG entry: x';
    expect(extractSection(body, '## **Description**')).toBeNull();
  });

  it('returns the rest of the body when there is no following heading', () => {
    const body = '## **Description**\n\ntail content';
    expect(extractSection(body, '## **Description**')).toContain('tail content');
  });
});

describe('hasNonEmptyDescription', () => {
  it('passes for any non-empty text', () => {
    expect(hasNonEmptyDescription('\n\nReal description.\n')).toEqual({ ok: true });
  });

  it('fails for empty section', () => {
    expect(hasNonEmptyDescription('').ok).toBe(false);
  });

  it('fails for HTML-comment-only section (the template default)', () => {
    expect(hasNonEmptyDescription('<!-- write something -->\n').ok).toBe(false);
  });

  it('fails for whitespace-only section', () => {
    expect(hasNonEmptyDescription('   \n\n  \t').ok).toBe(false);
  });
});

describe('hasValidIssueLink', () => {
  it.each([
    ['Fixes shortref', 'Fixes: #123'],
    ['Closes owner/repo#n', 'Closes: MetaMask/metamask-mobile#42'],
    ['Refs full URL', 'Refs: https://github.com/MetaMask/metamask-mobile/issues/1'],
    ['Refs Jira key', 'Refs: MCWP-603'],
    ['Plain rationale after Fixes', 'Fixes: internal refactor only'],
    ['Bold marker variant', '**Fixes:** #10'],
    ['Case-insensitive keyword', 'fixes: #11'],
  ])('passes for "%s"', (_label, content) => {
    expect(hasValidIssueLink(content).ok).toBe(true);
  });

  it.each([
    ['empty section', ''],
    ['bare Fixes', 'Fixes:'],
    ['bare Fixes with trailing whitespace', 'Fixes:   '],
    ['only HTML comments', '<!-- write something here -->'],
    ['no Fixes/Closes/Refs line at all', 'See PR description'],
    ['all linkage lines are blank', 'Fixes:\nCloses:\nRefs:'],
  ])('fails for "%s"', (_label, content) => {
    expect(hasValidIssueLink(content).ok).toBe(false);
  });

  it('passes when a blank Fixes: is followed by a valid Refs: line', () => {
    expect(hasValidIssueLink('Fixes:\nRefs: MCWP-603').ok).toBe(true);
  });

  it('passes when a blank Fixes: is followed by a valid Closes: line', () => {
    expect(hasValidIssueLink('Fixes:\nCloses: MetaMask/metamask-mobile#42').ok).toBe(true);
  });
});

describe('hasRealManualTesting', () => {
  it('passes for real Gherkin without any template token', () => {
    const real = `
\`\`\`gherkin
Feature: my actual feature

  Scenario: opens settings
    Given the user is on the wallet screen
    When the user taps the settings icon
    Then the settings screen opens
\`\`\``;
    expect(hasRealManualTesting(real).ok).toBe(true);
  });

  it('passes for explicit N/A with rationale', () => {
    expect(hasRealManualTesting('N/A — code-only refactor').ok).toBe(true);
  });

  it('fails for empty section', () => {
    expect(hasRealManualTesting('').ok).toBe(false);
  });

  it('fails when the template Gherkin title is still present', () => {
    expect(hasRealManualTesting('Feature: my feature name\nScenario: ...').ok).toBe(false);
  });

  it.each([
    '[verb for user action]',
    '[describe expected initial app state]',
    '[describe expected outcome]',
  ])('fails when placeholder %s is still present', (placeholder) => {
    const body = `Scenario: ${placeholder}`;
    expect(hasRealManualTesting(body).ok).toBe(false);
  });

  it('fails for the verbatim template block', () => {
    const verbatim = `
\`\`\`gherkin
Feature: my feature name

  Scenario: user [verb for user action]
    Given [describe expected initial app state]

    When user [verb for user action]
    Then [describe expected outcome]
\`\`\``;
    expect(hasRealManualTesting(verbatim).ok).toBe(false);
  });
});

describe('hasScreenshotsOrNa', () => {
  it('passes for a markdown image', () => {
    const body = `### **Before**\n\n![before](https://example.com/a.png)\n\n### **After**\n\n![after](https://example.com/b.png)`;
    expect(hasScreenshotsOrNa(body).ok).toBe(true);
  });

  it('passes for a GitHub user-content URL', () => {
    const body = `### **Before**\n\nN/A\n\n### **After**\n\nhttps://user-images.githubusercontent.com/1/abc.png`;
    expect(hasScreenshotsOrNa(body).ok).toBe(true);
  });

  it('passes for plain N/A', () => {
    expect(hasScreenshotsOrNa('### **Before**\nN/A\n### **After**\nN/A').ok).toBe(true);
  });

  it('fails when section reduces to only the subheadings (template default)', () => {
    const body = `### **Before**\n\n<!-- [screenshots/recordings] -->\n\n### **After**\n\n<!-- [screenshots/recordings] -->`;
    expect(hasScreenshotsOrNa(body).ok).toBe(false);
  });

  it('fails for empty section', () => {
    expect(hasScreenshotsOrNa('').ok).toBe(false);
  });
});

describe('hasAllAuthorChecklistChecked', () => {
  // Mirrors the 8 checkbox items in .github/pull-request-template.md.
  const allChecked = [
    '- [x] Followed contributor docs',
    '- [x] Completed PR template',
    '- [x] Included tests if applicable',
    '- [x] Documented code with JSDoc if applicable',
    '- [x] Applied right labels',
    '',
    '#### Performance checks (if applicable)',
    '',
    '- [x] Tested on Android',
    '- [x] Tested with power user scenario',
    '- [x] Instrumented with Sentry traces if applicable',
  ].join('\n');

  it('passes when every box is checked', () => {
    expect(hasAllAuthorChecklistChecked(allChecked).ok).toBe(true);
  });

  it('fails on a top-level unchecked box and surfaces its text', () => {
    const checklist = allChecked.replace(
      '- [x] Documented code with JSDoc if applicable',
      '- [ ] Documented code with JSDoc if applicable',
    );
    const result = hasAllAuthorChecklistChecked(checklist);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/JSDoc/);
  });

  it('fails on an unchecked box inside the Performance subsection', () => {
    const checklist = allChecked.replace(
      '- [x] Tested on Android',
      '- [ ] Tested on Android',
    );
    const result = hasAllAuthorChecklistChecked(checklist);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Tested on Android/);
  });

  it('ignores boxes inside HTML comments (commented-out boxes do not count)', () => {
    const checklist = `${allChecked}\n<!-- - [ ] commented-out item -->`;
    expect(hasAllAuthorChecklistChecked(checklist).ok).toBe(true);
  });

  it('fails when fewer rows than the template minimum remain (deleted rows bypass)', () => {
    // An author deleting 3 unchecked rows leaves only 5 boxes — all checked
    // but below the required 8. This must be a hard failure.
    const partial = [
      '- [x] Followed contributor docs',
      '- [x] Completed PR template',
      '- [x] Included tests if applicable',
      '- [x] Documented code with JSDoc if applicable',
      '- [x] Applied right labels',
    ].join('\n');
    const result = hasAllAuthorChecklistChecked(partial);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/5 of the required 8/);
  });

  it('fails when the section is empty (no checkboxes at all)', () => {
    expect(hasAllAuthorChecklistChecked('').ok).toBe(false);
  });

  it('fails when all checklist rows were deleted (heading only, no boxes)', () => {
    expect(hasAllAuthorChecklistChecked('\n\nSome plain text but no checkboxes\n').ok).toBe(false);
  });
});

describe('fenced-block injection resistance', () => {
  it('extractSection: a fake section heading inside a code block does not end the section early', () => {
    const body = [
      '## **Description**',
      '',
      '```',
      '## **Changelog**',
      '```',
      '',
      'Real description.',
      '',
      '## **Changelog**',
      '',
      'CHANGELOG entry: real',
    ].join('\n');

    const section = extractSection(body, '## **Description**');
    // The fake ## **Changelog** inside the code block must not terminate the
    // Description section — "Real description." must still be inside it.
    expect(section).toContain('Real description');
    // The real ## **Changelog** IS the boundary, so its content must not
    // appear in the Description section.
    expect(section).not.toContain('CHANGELOG entry: real');
  });

  it('hasChangelogEntry: a CHANGELOG entry inside a fenced block does not satisfy the check', () => {
    const section = [
      '```',
      'CHANGELOG entry: sneaky fake entry',
      '```',
      '',
      'CHANGELOG entry:',
    ].join('\n');

    expect(hasChangelogEntry(section, false).ok).toBe(false);
  });

  it('hasValidIssueLink: a Fixes line inside a fenced block does not satisfy the check', () => {
    const section = [
      '```',
      'Fixes: #123',
      '```',
      '',
      'Fixes:',
    ].join('\n');

    expect(hasValidIssueLink(section).ok).toBe(false);
  });

  it('hasAllAuthorChecklistChecked: checkboxes inside a fenced block are ignored', () => {
    const section = [
      '```',
      '- [x] Fake checked item',
      '- [x] Another fake inside fence',
      '- [x] Yet another fake',
      '- [x] More fake items',
      '- [x] Still fake',
      '- [x] Also fake',
      '- [x] Still inside fence',
      '```',
      '',
      '- [x] Real item one',
      '- [x] Real item two',
      '- [x] Real item three',
      '- [x] Real item four',
      '- [x] Real item five',
      '- [x] Real item six',
      '- [x] Real item seven',
      '- [ ] Real unchecked item',
    ].join('\n');

    const result = hasAllAuthorChecklistChecked(section);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Real unchecked item/);
  });
});

describe('hasChangelogEntry', () => {
  it('passes for a real entry', () => {
    expect(hasChangelogEntry('CHANGELOG entry: Added a tab', false).ok).toBe(true);
  });

  it('passes for the literal "null"', () => {
    expect(hasChangelogEntry('CHANGELOG entry: null', false).ok).toBe(true);
  });

  it('short-circuits when no-changelog label is present', () => {
    expect(hasChangelogEntry('anything', true).ok).toBe(true);
  });

  it('fails when the line is missing entirely', () => {
    expect(hasChangelogEntry('Some changelog prose but no prefix', false).ok).toBe(false);
  });

  it('fails when the line is present but empty', () => {
    expect(hasChangelogEntry('CHANGELOG entry:   ', false).ok).toBe(false);
  });

  it('ignores changelog lines inside HTML comments', () => {
    const section = `<!-- CHANGELOG entry: ignored -->`;
    expect(hasChangelogEntry(section, false).ok).toBe(false);
  });

  it('does not accept a CHANGELOG entry placed in another section of the full body', () => {
    // runAllChecks extracts the Changelog section before calling hasChangelogEntry,
    // so a line placed in Description cannot satisfy this check.
    const body = [
      '## **Description**',
      '',
      'CHANGELOG entry: sneaky line in description',
      '',
      '## **Changelog**',
      '',
      '<!-- fill in changelog here -->',
    ].join('\n');

    // Extract only the Changelog section (as runAllChecks does) — should fail.
    const section = extractSection(body, '## **Changelog**') ?? '';
    expect(hasChangelogEntry(section, false).ok).toBe(false);
  });
});

describe('runAllChecks', () => {
  it('returns no failures for a fully valid body', () => {
    expect(runAllChecks(fullValidBody, false)).toEqual([]);
  });

  it('aggregates every failure from an untouched template-like body', () => {
    const empty = `
## **Description**

<!-- write description here -->

## **Changelog**

CHANGELOG entry:

## **Related issues**

Fixes:

## **Manual testing steps**

\`\`\`gherkin
Feature: my feature name

  Scenario: user [verb for user action]
    Given [describe expected initial app state]

    When user [verb for user action]
    Then [describe expected outcome]
\`\`\`

## **Screenshots/Recordings**

### **Before**

<!-- [screenshots/recordings] -->

### **After**

<!-- [screenshots/recordings] -->

## **Pre-merge author checklist**

- [ ] First
- [ ] Second

## **Pre-merge reviewer checklist**

- [ ] Reviewer item
`.trim();
    const failures = runAllChecks(empty, false);
    expect(failures.length).toBe(6);
    expect(failures.map((f) => f.reason).join('\n')).toMatch(/Description/);
    expect(failures.map((f) => f.reason).join('\n')).toMatch(/Changelog/);
    expect(failures.map((f) => f.reason).join('\n')).toMatch(/Related issues/);
    expect(failures.map((f) => f.reason).join('\n')).toMatch(/Manual testing/);
    expect(failures.map((f) => f.reason).join('\n')).toMatch(/Screenshots/);
    expect(failures.map((f) => f.reason).join('\n')).toMatch(/author checklist/);
  });

  it('ignores reviewer checklist boxes (those are reviewer-side)', () => {
    // fullValidBody has an unchecked reviewer box on purpose.
    expect(extractSection(fullValidBody, '## **Pre-merge reviewer checklist**')).toContain('- [ ]');
    expect(runAllChecks(fullValidBody, false)).toEqual([]);
  });
});

// ─── parseDirective ───────────────────────────────────────────────────────────

describe('parseDirective', () => {
  it('returns null for non-directive content', () => {
    expect(parseDirective('Write a short description')).toBeNull();
    expect(parseDirective('')).toBeNull();
    expect(parseDirective('  some note  ')).toBeNull();
  });

  it('parses a single key=value pair', () => {
    expect(parseDirective('mms-check: type=text')).toEqual({ type: 'text' });
  });

  it('parses multiple key=value pairs', () => {
    expect(parseDirective('mms-check: type=changelog required=true')).toEqual({
      type: 'changelog',
      required: 'true',
    });
  });

  it('handles leading and trailing whitespace', () => {
    expect(parseDirective('  mms-check: type=checklist required=false  ')).toEqual({
      type: 'checklist',
      required: 'false',
    });
  });

  it('ignores malformed pairs without an equals sign', () => {
    expect(parseDirective('mms-check: type=text badpair')).toEqual({ type: 'text' });
  });
});

// ─── buildValidationPlan ──────────────────────────────────────────────────────

describe('buildValidationPlan', () => {
  it('produces one entry per section that has a directive', () => {
    const md = [
      '## **Section A**',
      '<!-- mms-check: type=text required=true -->',
      '',
      'Some content.',
      '',
      '## **Section B**',
      '<!-- mms-check: type=changelog required=false -->',
    ].join('\n');
    const plan = buildValidationPlan(tokenize(md));
    expect(plan).toHaveLength(2);
    expect(plan[0]).toEqual({ title: '## **Section A**', type: 'text', required: true, blocking: false });
    expect(plan[1]).toEqual({ title: '## **Section B**', type: 'changelog', required: false, blocking: false });
  });

  it('skips sections that have no directive', () => {
    const md = [
      '## **Section A**',
      '',
      'No directive here.',
      '',
      '## **Section B**',
      '<!-- mms-check: type=text required=true -->',
    ].join('\n');
    const plan = buildValidationPlan(tokenize(md));
    expect(plan).toHaveLength(1);
    expect(plan[0].title).toBe('## **Section B**');
  });

  it('ignores non-mms-check html_comments within a section', () => {
    const md = [
      '## **Section A**',
      '<!-- instructional comment -->',
      '<!-- mms-check: type=issue-link required=true -->',
    ].join('\n');
    const plan = buildValidationPlan(tokenize(md));
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe('issue-link');
  });

  it('associates the directive with its enclosing heading, not the next one', () => {
    const md = [
      '## **Heading One**',
      '<!-- mms-check: type=text required=true -->',
      '',
      '## **Heading Two**',
    ].join('\n');
    const plan = buildValidationPlan(tokenize(md));
    expect(plan[0].title).toBe('## **Heading One**');
  });

  it('returns an empty plan for markdown with no directives', () => {
    expect(buildValidationPlan(tokenize('# Title\n\nSome text.'))).toEqual([]);
  });

  it('treats required=false as non-required', () => {
    const md = '## **Section**\n<!-- mms-check: type=text required=false -->';
    const plan = buildValidationPlan(tokenize(md));
    expect(plan[0].required).toBe(false);
  });

  it('defaults required to true when not explicitly "false"', () => {
    const md = '## **Section**\n<!-- mms-check: type=text required=true -->';
    const plan = buildValidationPlan(tokenize(md));
    expect(plan[0].required).toBe(true);
  });

  it('reads blocking=true from the directive', () => {
    const md = '## **Section**\n<!-- mms-check: type=changelog required=true blocking=true -->';
    const plan = buildValidationPlan(tokenize(md));
    expect(plan[0].blocking).toBe(true);
  });

  it('reads blocking=false from the directive', () => {
    const md = '## **Section**\n<!-- mms-check: type=text required=true blocking=false -->';
    const plan = buildValidationPlan(tokenize(md));
    expect(plan[0].blocking).toBe(false);
  });

  it('defaults blocking to false when the key is absent', () => {
    const md = '## **Section**\n<!-- mms-check: type=text required=true -->';
    const plan = buildValidationPlan(tokenize(md));
    expect(plan[0].blocking).toBe(false);
  });
});

// ─── validatePlanTypes ────────────────────────────────────────────────────────

describe('validatePlanTypes', () => {
  const registry = { text: () => ({ ok: true as const }) };

  it('does not throw when all types are present in the registry', () => {
    const plan = [{ title: '## Foo', type: 'text', required: true, blocking: false }];
    expect(() => validatePlanTypes(plan, registry)).not.toThrow();
  });

  it('throws for an unknown type', () => {
    const plan = [{ title: '## Bar', type: 'unknown-type', required: true, blocking: false }];
    expect(() => validatePlanTypes(plan, registry)).toThrow(
      /Unknown mms-check type "unknown-type" in section "## Bar"/,
    );
  });

  it('throws for the first unknown type in a mixed plan', () => {
    const plan = [
      { title: '## Good', type: 'text', required: true, blocking: false },
      { title: '## Bad', type: 'typo-type', required: true, blocking: false },
    ];
    expect(() => validatePlanTypes(plan, registry)).toThrow(/typo-type/);
  });
});

// ─── parseDirective — blocking key ────────────────────────────────────────────

describe('parseDirective — blocking key', () => {
  it('parses blocking=true', () => {
    expect(parseDirective('mms-check: type=changelog required=true blocking=true')).toEqual({
      type: 'changelog',
      required: 'true',
      blocking: 'true',
    });
  });

  it('parses blocking=false', () => {
    expect(parseDirective('mms-check: type=text required=true blocking=false')).toEqual({
      type: 'text',
      required: 'true',
      blocking: 'false',
    });
  });

  it('does not include a blocking key when the field is absent', () => {
    const result = parseDirective('mms-check: type=text required=true');
    expect(result).not.toHaveProperty('blocking');
  });
});

// ─── runAllChecks — blocking flag stamping ────────────────────────────────────

describe('runAllChecks — blocking flag on failures', () => {
  it('stamps blocking:true on the changelog failure when template has blocking=true', () => {
    // The real pull-request-template.md tags changelog with blocking=true.
    const body = `
## **Description**

Real description.

## **Changelog**

CHANGELOG entry:

## **Related issues**

Fixes: #1

## **Manual testing steps**

\`\`\`gherkin
Feature: ready for review

  Scenario: user opens the PR
    Given the author fills the PR
    When user submits
    Then the validator passes
\`\`\`

## **Screenshots/Recordings**

### **Before**

N/A

### **After**

N/A

## **Pre-merge author checklist**

- [x] Followed contributor docs
- [x] Completed PR template
- [x] Included tests if applicable
- [x] Documented code with JSDoc if applicable
- [x] Applied right labels

#### Performance checks (if applicable)

- [x] Tested on Android
- [x] Tested with power user scenario
- [x] Instrumented with Sentry traces if applicable

## **Pre-merge reviewer checklist**

- [ ] Reviewer item
`.trim();

    const failures = runAllChecks(body, false);
    const changelogFailure = failures.find((f) => f.reason.includes('Changelog'));
    expect(changelogFailure).toBeDefined();
    expect(changelogFailure?.blocking).toBe(true);
  });

  it('stamps blocking:false on non-blocking failures', () => {
    const body = `
## **Description**

## **Changelog**

CHANGELOG entry: Real entry.

## **Related issues**

Fixes: #1

## **Manual testing steps**

\`\`\`gherkin
Feature: ready for review

  Scenario: user opens the PR
    Given the author fills the PR
    When user submits
    Then the validator passes
\`\`\`

## **Screenshots/Recordings**

### **Before**

N/A

### **After**

N/A

## **Pre-merge author checklist**

- [x] Followed contributor docs
- [x] Completed PR template
- [x] Included tests if applicable
- [x] Documented code with JSDoc if applicable
- [x] Applied right labels

#### Performance checks (if applicable)

- [x] Tested on Android
- [x] Tested with power user scenario
- [x] Instrumented with Sentry traces if applicable

## **Pre-merge reviewer checklist**

- [ ] Reviewer item
`.trim();

    const failures = runAllChecks(body, false);
    const descriptionFailure = failures.find((f) => f.reason.includes('Description'));
    expect(descriptionFailure).toBeDefined();
    expect(descriptionFailure?.blocking).toBe(false);
  });
});
