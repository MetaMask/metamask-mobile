import {
  MONEY_BALANCE_FRACTION_DIGITS,
  shouldAnimateBalanceChange,
  toDisplayAmount,
  type BalanceAnimationParams,
} from './balanceAnimation';

describe('toDisplayAmount', () => {
  it.each([
    ['rounds to the rendered precision', 1234.5678, 1234.57],
    ['collapses sub-cent dust to zero', 0.004, 0],
    ['collapses negative dust to zero', -0.004, 0],
    ['keeps a value at exactly the dust threshold', 0.01, 0.01],
  ])('%s', (_name, input, expected) => {
    expect(toDisplayAmount(input)).toBe(expected);
  });

  it('treats share-price drift below the rendered precision as no change', () => {
    expect(toDisplayAmount(1000.000001)).toBe(toDisplayAmount(1000.000002));
  });

  it('exposes the precision the balance is rendered with', () => {
    expect(MONEY_BALANCE_FRACTION_DIGITS).toBe(2);
  });
});

describe('shouldAnimateBalanceChange', () => {
  const params = (
    overrides: Partial<BalanceAnimationParams> = {},
  ): BalanceAnimationParams => ({
    nextAmount: 200,
    previousAmount: 100,
    isIdentityChange: false,
    isInitialResolution: false,
    hasPendingUserOp: false,
    ...overrides,
  });

  it('rolls the first resolved balance up from the persisted anchor', () => {
    expect(
      shouldAnimateBalanceChange(params({ isInitialResolution: true })),
    ).toBe(true);
  });

  it('does not roll a first ever load with no anchor to roll from', () => {
    expect(
      shouldAnimateBalanceChange(
        params({ isInitialResolution: true, previousAmount: undefined }),
      ),
    ).toBe(false);
  });

  it('rolls a change the user caused', () => {
    expect(shouldAnimateBalanceChange(params({ hasPendingUserOp: true }))).toBe(
      true,
    );
  });

  it('does not roll a background poll', () => {
    expect(shouldAnimateBalanceChange(params())).toBe(false);
  });

  it('does not roll when the rendered figure is unchanged', () => {
    expect(
      shouldAnimateBalanceChange(
        params({ nextAmount: 100, hasPendingUserOp: true }),
      ),
    ).toBe(false);
  });

  it('replaces the figure outright when the account or currency changes', () => {
    expect(
      shouldAnimateBalanceChange(
        params({
          isIdentityChange: true,
          isInitialResolution: true,
          hasPendingUserOp: true,
        }),
      ),
    ).toBe(false);
  });

  it('rolls downwards for a withdrawal', () => {
    expect(
      shouldAnimateBalanceChange(
        params({ nextAmount: 50, hasPendingUserOp: true }),
      ),
    ).toBe(true);
  });
});
