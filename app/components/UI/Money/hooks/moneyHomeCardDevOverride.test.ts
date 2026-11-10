import {
  getKycDecisionDismissDevOverride,
  getMoneyHomeCardDevOverride,
  getMoneyHomeCardDevOverrideById,
  setMoneyHomeCardDevOverride,
  subscribeMoneyHomeCardDevOverride,
} from './moneyHomeCardDevOverride';

describe('moneyHomeCardDevOverride', () => {
  const devGlobal = global as unknown as { __DEV__: boolean };
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    devGlobal.__DEV__ = true;
  });

  afterEach(() => {
    devGlobal.__DEV__ = true;
    setMoneyHomeCardDevOverride(null);
    devGlobal.__DEV__ = originalDev;
  });

  it('starts on live routing', () => {
    expect(getMoneyHomeCardDevOverride()).toBeNull();
  });

  it('stores a VBA-region Get started override and notifies subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeMoneyHomeCardDevOverride(listener);
    const getStarted = getMoneyHomeCardDevOverrideById('get_started');

    setMoneyHomeCardDevOverride(getStarted);

    expect(getMoneyHomeCardDevOverride()).toEqual(getStarted);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('returns Add funds after a KYC decision dismiss when the Money account is unfunded', () => {
    expect(getKycDecisionDismissDevOverride(false).id).toBe('add_funds');
  });

  it('returns the card step after a KYC decision dismiss when the Money account is funded', () => {
    expect(getKycDecisionDismissDevOverride(true).id).toBe('card');
  });

  it('hides a stored override outside dev builds', () => {
    const getStarted = getMoneyHomeCardDevOverrideById('get_started');
    setMoneyHomeCardDevOverride(getStarted);
    devGlobal.__DEV__ = false;

    expect(getMoneyHomeCardDevOverride()).toBeNull();

    devGlobal.__DEV__ = true;
    expect(getMoneyHomeCardDevOverride()).toEqual(getStarted);
  });
});
