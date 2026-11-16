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
 * Records whether the active flow's final Order Details screen shows an accepted order.
 *
 * Order Details keeps this in sync with the order it shows, so leaving by Close, the back
 * arrow, or a back gesture all count, and an order that turns failed clears it again.
 *
 * @param isAccepted - Whether the order shown is accepted.
 */
export function setWalletHomeOnboardingFundFlowOrderAccepted(
  isAccepted: boolean,
): void {
  if (isWalletHomeOnboardingFundFlowActive) {
    isWalletHomeOnboardingFundFlowCompleted = isAccepted;
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
 * Cancels a flow that returned without reaching an accepted order on Order Details.
 */
export function cancelWalletHomeOnboardingFundFlow(): void {
  isWalletHomeOnboardingFundFlowActive = false;
  isWalletHomeOnboardingFundFlowCompleted = false;
}
