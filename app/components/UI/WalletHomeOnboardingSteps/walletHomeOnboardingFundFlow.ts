let isWalletHomeOnboardingFundFlowActive = false;
let isWalletHomeOnboardingFundFlowCompleted = false;

/**
 * Starts a transient onboarding Fund buy flow.
 *
 * The marker is intentionally kept outside Redux because it represents an in-flight
 * navigation handoff and must not be persisted with onboarding progress.
 */
export function startWalletHomeOnboardingFundFlow(): void {
  isWalletHomeOnboardingFundFlowActive = true;
  isWalletHomeOnboardingFundFlowCompleted = false;
}

/**
 * Records that the active flow reached its final Order Details Close action.
 */
export function completeWalletHomeOnboardingFundFlow(): void {
  if (isWalletHomeOnboardingFundFlowActive) {
    isWalletHomeOnboardingFundFlowCompleted = true;
  }
}

/**
 * Consumes the completion marker when Wallet regains focus.
 *
 * Every return consumes the active flow, including unsuccessful returns, so a
 * later buy flow cannot inherit an earlier completion.
 */
export function consumeWalletHomeOnboardingFundFlowCompletion(): boolean {
  const completed =
    isWalletHomeOnboardingFundFlowActive &&
    isWalletHomeOnboardingFundFlowCompleted;
  isWalletHomeOnboardingFundFlowActive = false;
  isWalletHomeOnboardingFundFlowCompleted = false;
  return completed;
}

/**
 * Cancels a flow that returned without reaching the final Order Details Close action.
 */
export function cancelWalletHomeOnboardingFundFlow(): void {
  isWalletHomeOnboardingFundFlowActive = false;
  isWalletHomeOnboardingFundFlowCompleted = false;
}
