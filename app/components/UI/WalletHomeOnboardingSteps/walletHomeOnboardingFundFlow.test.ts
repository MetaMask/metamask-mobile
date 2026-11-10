import {
  cancelWalletHomeOnboardingFundFlow,
  consumeWalletHomeOnboardingFundFlowCompletion,
  setWalletHomeOnboardingFundFlowOrderAccepted,
  startWalletHomeOnboardingFundFlow,
} from './walletHomeOnboardingFundFlow';

describe('walletHomeOnboardingFundFlow', () => {
  afterEach(() => {
    cancelWalletHomeOnboardingFundFlow();
  });

  it('consumes completion only after the active flow is completed', () => {
    startWalletHomeOnboardingFundFlow();

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);

    startWalletHomeOnboardingFundFlow();
    setWalletHomeOnboardingFundFlowOrderAccepted(true);

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(true);
    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });

  it('does not let a cancelled flow complete', () => {
    startWalletHomeOnboardingFundFlow();

    cancelWalletHomeOnboardingFundFlow();
    setWalletHomeOnboardingFundFlowOrderAccepted(true);

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });

  it('clears completion when the active attempt is cancelled', () => {
    startWalletHomeOnboardingFundFlow();
    setWalletHomeOnboardingFundFlowOrderAccepted(true);

    cancelWalletHomeOnboardingFundFlow();

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });

  it('clears completion when the order is no longer accepted', () => {
    startWalletHomeOnboardingFundFlow();
    setWalletHomeOnboardingFundFlowOrderAccepted(true);

    setWalletHomeOnboardingFundFlowOrderAccepted(false);

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });
});
