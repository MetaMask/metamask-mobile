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

  it('returns false without a selected account', () => {
    const settings = { perpsCrossMarginConfirmedAccounts: { '0xabc': true } };

    const hasConfirmed = selectHasConfirmedCrossMargin.resultFunc(
      settings,
      undefined,
    );

    expect(hasConfirmed).toBe(false);
  });

  it('returns false before any confirmation is stored', () => {
    const hasConfirmed = selectHasConfirmedCrossMargin.resultFunc({}, '0xabc');

    expect(hasConfirmed).toBe(false);
  });
});
