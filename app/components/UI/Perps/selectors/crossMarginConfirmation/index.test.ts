import { selectHasConfirmedCrossMargin } from '.';

describe('selectHasConfirmedCrossMargin', () => {
  it('returns true when the selected account confirmed Cross', () => {
    expect(
      selectHasConfirmedCrossMargin.resultFunc(
        { perpsCrossMarginConfirmedAccounts: { '0xabc': true } },
        '0xabc',
      ),
    ).toBe(true);
  });

  it('returns false when only another account confirmed Cross', () => {
    expect(
      selectHasConfirmedCrossMargin.resultFunc(
        { perpsCrossMarginConfirmedAccounts: { '0xdef': true } },
        '0xabc',
      ),
    ).toBe(false);
  });

  it('returns false without a selected account or stored confirmations', () => {
    expect(
      selectHasConfirmedCrossMargin.resultFunc(
        { perpsCrossMarginConfirmedAccounts: { '0xabc': true } },
        undefined,
      ),
    ).toBe(false);
    expect(selectHasConfirmedCrossMargin.resultFunc({}, '0xabc')).toBe(false);
  });
});
