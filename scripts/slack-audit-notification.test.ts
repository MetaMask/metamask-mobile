/**
 * Unit tests for the pure message builders and owners-file validation in
 * slack-audit-notification.ts. Network calls (postToSlack) are exercised via
 * SLACK_AUDIT_NOTIFICATION_DRY_RUN in the workflow itself, not here.
 */

import {
  buildDetectedMessage,
  buildFailureMessage,
  buildResultMessage,
  loadOwners,
} from './slack-audit-notification';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const fs = require('fs');

afterEach(() => {
  jest.mocked(fs.readFileSync).mockReset();
});

function blocksText(payload: { blocks: object[] }): string {
  return JSON.stringify(payload.blocks);
}

describe('loadOwners', () => {
  it('parses a valid owners file', () => {
    fs.readFileSync.mockReturnValue(`
slack_channel: 'C0123'
owner:
  github: 'someone'
  slack_id: 'U0123'
`);

    expect(loadOwners('.github/audit-owners.yml')).toEqual({
      slack_channel: 'C0123',
      owner: { github: 'someone', slack_id: 'U0123' },
    });
  });

  it('includes an optional manager when present', () => {
    fs.readFileSync.mockReturnValue(`
slack_channel: 'C0123'
owner:
  github: 'someone'
  slack_id: 'U0123'
manager:
  slack_id: 'U0456'
`);

    expect(loadOwners('.github/audit-owners.yml').manager).toEqual({ slack_id: 'U0456' });
  });

  it('throws when slack_channel is missing', () => {
    fs.readFileSync.mockReturnValue(`
owner:
  github: 'someone'
  slack_id: 'U0123'
`);

    expect(() => loadOwners('.github/audit-owners.yml')).toThrow(/missing slack_channel/);
  });

  it('throws when owner.slack_id is missing', () => {
    fs.readFileSync.mockReturnValue(`
slack_channel: 'C0123'
owner:
  github: 'someone'
`);

    expect(() => loadOwners('.github/audit-owners.yml')).toThrow(
      /missing slack_channel, owner.github, or owner.slack_id/,
    );
  });

  it('throws when owner.github is missing', () => {
    fs.readFileSync.mockReturnValue(`
slack_channel: 'C0123'
owner:
  slack_id: 'U0123'
`);

    expect(() => loadOwners('.github/audit-owners.yml')).toThrow(
      /missing slack_channel, owner.github, or owner.slack_id/,
    );
  });
});

describe('buildDetectedMessage', () => {
  it('uses singular wording for exactly 1 advisory', () => {
    const { text } = buildDetectedMessage({ count: 1, runUrl: '', ownerSlackId: 'U0123' });

    expect(text).toBe('🔎 Dependency audit: 1 new advisory detected');
  });

  it('uses plural wording for more than 1 advisory', () => {
    const { text } = buildDetectedMessage({ count: 3, runUrl: '', ownerSlackId: 'U0123' });

    expect(text).toBe('🔎 Dependency audit: 3 new advisories detected');
  });

  it('mentions only the owner when no manager is configured', () => {
    const payload = buildDetectedMessage({ count: 1, runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(payload)).toContain('<@U0123>');
    expect(blocksText(payload)).not.toContain('<@U0456>');
  });

  it('mentions both owner and manager when configured', () => {
    const payload = buildDetectedMessage({ count: 1, runUrl: '', ownerSlackId: 'U0123', managerSlackId: 'U0456' });

    expect(blocksText(payload)).toContain('<@U0123>');
    expect(blocksText(payload)).toContain('<@U0456>');
  });

  it('includes a run-url block only when a runUrl is given', () => {
    const withUrl = buildDetectedMessage({ count: 1, runUrl: 'https://example.com/run', ownerSlackId: 'U0123' });
    const withoutUrl = buildDetectedMessage({ count: 1, runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(withUrl)).toContain('https://example.com/run');
    expect(withoutUrl.blocks.length).toBeLessThan(withUrl.blocks.length);
  });
});

describe('buildResultMessage', () => {
  const advisory = (pkg: string) => ({ pkg, id: `GHSA-${pkg}`, severity: 'moderate', title: `${pkg} issue`, url: undefined });

  it('uses singular wording for exactly 1 total advisory', () => {
    const { text } = buildResultMessage({ fixed: [], manual: [advisory('lodash')], issueUrl: '', runUrl: '', ownerSlackId: 'U0123' });

    expect(text).toBe('🔒 Dependency audit: 1 new advisory found');
  });

  it('uses plural wording and sums fixed + manual for the total', () => {
    const { text } = buildResultMessage({
      fixed: [advisory('a')],
      manual: [advisory('b'), advisory('c')],
      issueUrl: '',
      runUrl: '',
      ownerSlackId: 'U0123',
    });

    expect(text).toBe('🔒 Dependency audit: 3 new advisories found');
  });

  it('omits the "Fixed" section when nothing was fixed', () => {
    const payload = buildResultMessage({ fixed: [], manual: [advisory('lodash')], issueUrl: '', runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(payload)).not.toContain('Fixed');
  });

  it('omits the "Needs manual review" section when nothing is manual', () => {
    const payload = buildResultMessage({ fixed: [advisory('lodash')], manual: [], issueUrl: '', runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(payload)).not.toContain('Needs manual review');
  });

  it('includes a links block only with at least one of issueUrl/runUrl', () => {
    const withLinks = buildResultMessage({
      fixed: [],
      manual: [advisory('lodash')],
      issueUrl: 'https://example.com/issues/1',
      runUrl: '',
      ownerSlackId: 'U0123',
    });
    const withoutLinks = buildResultMessage({ fixed: [], manual: [advisory('lodash')], issueUrl: '', runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(withLinks)).toContain('https://example.com/issues/1');
    expect(withoutLinks.blocks.length).toBeLessThan(withLinks.blocks.length);
  });

  it('splits a long advisory list across multiple section blocks instead of exceeding Slack’s 3000-char limit', () => {
    // Slack's chat.postMessage rejects any block whose text exceeds 3000
    // characters — a single section holding every advisory on a large
    // first-run backlog would blow past that and fail the whole call,
    // silently dropping this "result" message even though "detected"
    // already posted.
    const manual = Array.from({ length: 80 }, (_, i) =>
      advisory(`package-with-a-fairly-long-name-${i}`),
    );

    const payload = buildResultMessage({ fixed: [], manual, issueUrl: '', runUrl: '', ownerSlackId: 'U0123' });

    const sectionTexts = payload.blocks
      .filter((block): block is { type: string; text: { text: string } } => (block as { type: string }).type === 'section')
      .map((block) => block.text.text);
    expect(sectionTexts.length).toBeGreaterThan(1);
    for (const text of sectionTexts) {
      expect(text.length).toBeLessThanOrEqual(3000);
    }
    // Every advisory must still show up somewhere, just split across blocks.
    for (const entry of manual) {
      expect(sectionTexts.some((text) => text.includes(entry.pkg))).toBe(true);
    }
  });

  it('clamps a single unusually long advisory line so it alone cannot exceed the limit', () => {
    const longTitle = 'x'.repeat(4000);
    const payload = buildResultMessage({
      fixed: [],
      manual: [{ pkg: 'lodash', id: 'GHSA-lodash', severity: 'moderate', title: longTitle, url: undefined }],
      issueUrl: '',
      runUrl: '',
      ownerSlackId: 'U0123',
    });

    const sectionTexts = payload.blocks
      .filter((block): block is { type: string; text: { text: string } } => (block as { type: string }).type === 'section')
      .map((block) => block.text.text);
    for (const text of sectionTexts) {
      expect(text.length).toBeLessThanOrEqual(3000);
    }
  });
});

describe('buildFailureMessage', () => {
  it('names the failed step when given', () => {
    const payload = buildFailureMessage({ failedStep: 'Collect advisories', runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(payload)).toContain('Collect advisories');
  });

  it('falls back to "an unknown step" when failedStep is empty', () => {
    const payload = buildFailureMessage({ failedStep: '', runUrl: '', ownerSlackId: 'U0123' });

    expect(blocksText(payload)).toContain('an unknown step');
  });

  it('always has the fixed header text regardless of inputs', () => {
    const { text } = buildFailureMessage({ failedStep: 'anything', runUrl: '', ownerSlackId: 'U0123' });

    expect(text).toBe('🚨 Dependency audit escalation hit an error');
  });
});
