import {
  STATUS,
  budgetStatus,
  buildFailureNotice,
  buildSlackMessage,
  exploreUrl,
} from './swaps-perf-budgets.mjs';

const result = (
  label: string,
  status: string,
  measured: { p90: number | null; n: number },
) => ({
  rule: { label, guardrailMs: 5000 },
  measured: { fullScan: true, ...measured },
  status,
  url: 'https://example.com/explore',
});

const options = {
  window: {
    start: new Date('2026-10-26T00:00:00Z'),
    end: new Date('2026-11-09T00:00:00Z'),
    label: '2026-10-26 – 2026-11-08 UTC',
  },
  runUrl: 'https://example.com/run',
};

const dashboardLink = (id: string, project: string, client: string) =>
  `<https://metamask.sentry.io/dashboard/${id}/?project=${project}&environment=production&start=2026-10-26T00%3A00%3A00&end=2026-11-09T00%3A00%3A00&utc=true|${client}>`;
const mobileHeading = `*${dashboardLink('9580363', '2299799', 'Mobile')}*`;

describe('budgetStatus', () => {
  it('needs the minimum sample count and a full scan', () => {
    const status = (p90: number | null, n: number, fullScan = true) =>
      budgetStatus({ p90, n, fullScan }, 5199);
    expect(status(5300, 4176)).toBe(STATUS.BREACH);
    expect(status(5199, 4176)).toBe(STATUS.OK);
    expect(status(9000, 399)).toBe(STATUS.NOT_EVALUABLE);
    expect(status(9000, 4176, false)).toBe(STATUS.NOT_EVALUABLE);
    expect(status(null, 0)).toBe(STATUS.NOT_EVALUABLE);
  });
});

describe('buildSlackMessage', () => {
  it('leads with the all-clear verdict and lists every rule by client', () => {
    const message = buildSlackMessage(
      [
        result('Mobile Swap Quote Fetch (mid-tier Android)', STATUS.OK, {
          p90: 4000,
          n: 4176,
        }),
        result('Extension Swap Quote Fetch', STATUS.OK, { p90: 2500, n: 671 }),
      ],
      options,
    );
    expect(message).toBe(
      [
        ':white_check_mark: *Swaps performance budgets: all 2 rules within guardrails*',
        '2026-10-26 – 2026-11-08 UTC · 14-day p90 vs guardrail',
        '',
        `${mobileHeading} (mid-tier Android)`,
        ':white_check_mark: <https://example.com/explore|Swap Quote Fetch>: 4,000ms / 5,000ms (80%) · n=4,176',
        '',
        `*${dashboardLink('10089240', '273505', 'Extension')}*`,
        ':white_check_mark: <https://example.com/explore|Swap Quote Fetch>: 2,500ms / 5,000ms (50%) · n=671',
        '',
        '<https://example.com/run|Run log>',
      ].join('\n'),
    );
  });

  it('counts breaches in the verdict and lists them first, in bold', () => {
    const message = buildSlackMessage(
      [
        result('Mobile Swap View Loaded', STATUS.OK, { p90: 4000, n: 4176 }),
        result('Mobile Swap Token Search', STATUS.NOT_EVALUABLE, {
          p90: 9000,
          n: 120,
        }),
        result('Mobile Swap Quote Fetch', STATUS.BREACH, { p90: 5300, n: 4176 }),
      ],
      options,
    );
    const lines = message.split('\n');
    expect(lines[0]).toBe(
      ':rotating_light: *Swaps performance budgets: 1 of 3 over guardrail, 1 not evaluable*',
    );
    expect(lines.slice(3, 7)).toEqual([
      mobileHeading,
      ':rotating_light: <https://example.com/explore|Swap Quote Fetch>: *5,300ms / 5,000ms (106%)* · n=4,176',
      ':grey_question: <https://example.com/explore|Swap Token Search>: not evaluable (n below 400) · n=120',
      ':white_check_mark: <https://example.com/explore|Swap View Loaded>: 4,000ms / 5,000ms (80%) · n=4,176',
    ]);
    expect(message).toMatch(/Triage within 2 business days/);
  });
});

describe('exploreUrl', () => {
  it('sets the page environment filter to production', () => {
    const url = new URL(
      exploreUrl(
        { query: 'environment:production span.name:"Swap Quote Fetch"', projectId: '2299799' },
        { start: new Date('2026-10-26T00:00:00Z'), end: new Date('2026-11-09T00:00:00Z') },
      ),
    );
    expect(url.searchParams.get('environment')).toBe('production');
    expect(url.searchParams.get('project')).toBe('2299799');
  });
});

describe('buildFailureNotice', () => {
  it('leads with the failure verdict and links the run', () => {
    expect(buildFailureNotice(options)).toBe(
      ":warning: *Swaps performance budgets: check failed*\nToday's results may be missing or incomplete.\n<https://example.com/run|Run log>",
    );
  });
});
