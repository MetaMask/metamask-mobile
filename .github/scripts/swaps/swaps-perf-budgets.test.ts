import { STATUS, budgetStatus, buildSlackMessage } from './swaps-perf-budgets.mjs';

const result = (
  label: string,
  status: string,
  measured: { p90: number | null; n: number },
) => ({
  rule: { label, guardrailMs: 5199 },
  measured: { fullScan: true, ...measured },
  status,
  url: 'https://example.com/explore',
});

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
  it('lists breaches and not-evaluable rules, and nothing else', () => {
    const ok = result('Within', STATUS.OK, { p90: 4000, n: 4176 });
    const breach = result('Over', STATUS.BREACH, { p90: 5300, n: 4176 });
    const low = result('Sparse', STATUS.NOT_EVALUABLE, { p90: 9000, n: 120 });
    const options = { runUrl: 'https://example.com/run' };

    expect(buildSlackMessage([ok], options)).toBeNull();

    const message = buildSlackMessage([ok, breach, low], options);
    expect(message).toMatch(
      /\*Over the guardrail\*[^]*Over: p90 5,300ms, guardrail 5,199ms, n=4,176>/,
    );
    expect(message).toMatch(
      /\*Not evaluable\*[^]*Sparse: not evaluable \(n below 400\)/,
    );
    expect(message).not.toMatch(/Within/);
    expect(message).toMatch(/<https:\/\/example\.com\/run\|GitHub Actions>/);
  });
});
