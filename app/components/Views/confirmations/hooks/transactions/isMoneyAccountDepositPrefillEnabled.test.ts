import { isMoneyAccountDepositPrefillEnabled } from './isMoneyAccountDepositPrefillEnabled';

describe('isMoneyAccountDepositPrefillEnabled', () => {
  it('returns true when kill-switch and A/B treatment are enabled', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: true,
        abTestPrefillEnabled: true,
      }),
    ).toBe(true);
  });

  it('returns false when A/B control disables prefill', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: true,
        abTestPrefillEnabled: false,
      }),
    ).toBe(false);
  });

  it('returns false when remote kill-switch is off', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: false,
        abTestPrefillEnabled: true,
      }),
    ).toBe(false);
  });

  it('does not force-enable addMusd by default (amount path)', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: false,
        abTestPrefillEnabled: false,
        intent: 'addMusd',
      }),
    ).toBe(false);
  });

  it('force-enables addMusd when forceAddMusd is true (loader path)', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: false,
        abTestPrefillEnabled: false,
        intent: 'addMusd',
        forceAddMusd: true,
      }),
    ).toBe(true);
  });

  it('returns false for card even when kill-switch and treatment are enabled', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: true,
        abTestPrefillEnabled: true,
        intent: 'card',
      }),
    ).toBe(false);
  });
});
