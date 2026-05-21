import {
  extractSection,
  hasAllAuthorChecklistChecked,
  hasChangelogEntry,
  hasNonEmptyDescription,
  hasRealManualTesting,
  hasScreenshotsOrNa,
  hasValidIssueLink,
  PR_TEMPLATE_SECTIONS,
  runAllChecks,
  stripHtmlComments,
} from './pr-template-checks';

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

- [x] First item
- [x] Second item

#### Performance checks (if applicable)

- [x] Performance item

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
  ])('fails for "%s"', (_label, content) => {
    expect(hasValidIssueLink(content).ok).toBe(false);
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
  it('passes when every box is checked', () => {
    const checklist = `
- [x] First
- [x] Second

#### Performance checks (if applicable)

- [x] Tested on Android
`;
    expect(hasAllAuthorChecklistChecked(checklist).ok).toBe(true);
  });

  it('fails on a top-level unchecked box and surfaces its text', () => {
    const checklist = `- [x] First\n- [ ] Second important item\n- [x] Third`;
    const result = hasAllAuthorChecklistChecked(checklist);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Second important item/);
  });

  it('fails on an unchecked box inside the Performance subsection', () => {
    const checklist = `
- [x] First
- [x] Second

#### Performance checks (if applicable)

- [ ] Tested on Android
`;
    const result = hasAllAuthorChecklistChecked(checklist);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Tested on Android/);
  });

  it('ignores boxes inside HTML comments', () => {
    const checklist = `- [x] First\n<!-- - [ ] commented-out -->\n- [x] Second`;
    expect(hasAllAuthorChecklistChecked(checklist).ok).toBe(true);
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
    expect(hasChangelogEntry('## **Description**\n\nhello', false).ok).toBe(false);
  });

  it('fails when the line is present but empty', () => {
    expect(hasChangelogEntry('CHANGELOG entry:   ', false).ok).toBe(false);
  });

  it('ignores changelog lines inside HTML comments', () => {
    const body = `<!-- CHANGELOG entry: ignored -->\n## **Description**\nhello`;
    expect(hasChangelogEntry(body, false).ok).toBe(false);
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
    expect(extractSection(fullValidBody, PR_TEMPLATE_SECTIONS.reviewerChecklist)).toContain('- [ ]');
    expect(runAllChecks(fullValidBody, false)).toEqual([]);
  });
});
