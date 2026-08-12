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

  it('returns true for addMusd even when kill-switch or A/B would disable', () => {
    expect(
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: false,
        abTestPrefillEnabled: false,
        intent: 'addMusd',
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
