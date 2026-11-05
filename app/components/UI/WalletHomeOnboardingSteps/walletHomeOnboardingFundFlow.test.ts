import {
  cancelWalletHomeOnboardingFundFlow,
  completeWalletHomeOnboardingFundFlow,
  consumeWalletHomeOnboardingFundFlowCompletion,
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
    completeWalletHomeOnboardingFundFlow();

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(true);
    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });

  it('does not let a cancelled flow complete', () => {
    startWalletHomeOnboardingFundFlow();

    cancelWalletHomeOnboardingFundFlow();
    completeWalletHomeOnboardingFundFlow();

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });

  it('clears completion when the active attempt is cancelled', () => {
    startWalletHomeOnboardingFundFlow();
    completeWalletHomeOnboardingFundFlow();

    cancelWalletHomeOnboardingFundFlow();

    expect(consumeWalletHomeOnboardingFundFlowCompletion()).toBe(false);
  });
});
