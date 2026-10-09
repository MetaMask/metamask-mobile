export interface ShouldShowApplePaySplashParams {
  isIos: boolean;
  isAuthenticated: boolean;
  applePayCapability: boolean;
  provisioningEnabled: boolean;
  seen: boolean;
  canAddToWallet: boolean;
  isPushProvisioningLoading: boolean;
}

/**
 * One-time Card Home announcement.
 * It appears on iOS after the cardholder is signed in, when Apple Pay
 * provisioning is enabled and this card can still be added to Wallet.
 */
export function shouldShowApplePaySplash({
  isIos,
  isAuthenticated,
  applePayCapability,
  provisioningEnabled,
  seen,
  canAddToWallet,
  isPushProvisioningLoading,
}: ShouldShowApplePaySplashParams): boolean {
  return (
    isIos &&
    isAuthenticated &&
    applePayCapability &&
    provisioningEnabled &&
    !seen &&
    !isPushProvisioningLoading &&
    canAddToWallet
  );
}
