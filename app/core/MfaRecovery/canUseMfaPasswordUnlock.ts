/**
 * Gates Money MFA password unlock (authenticateIdentifier → seedless).
 * Used by Onboarding social login when rehydrating an existing seedless wallet.
 */
export function canUseMfaPasswordUnlock(params: {
  isMoneyMfaEnabled: boolean;
  createWallet: boolean;
  seedlessUserId?: string | null;
  seedlessAuthConnection?: string | null;
  provider: string;
  hasMfaRecoveryController: boolean;
}): boolean {
  const {
    isMoneyMfaEnabled,
    createWallet,
    seedlessUserId,
    seedlessAuthConnection,
    provider,
    hasMfaRecoveryController,
  } = params;

  return (
    isMoneyMfaEnabled &&
    !createWallet &&
    Boolean(seedlessUserId) &&
    seedlessAuthConnection === provider &&
    hasMfaRecoveryController
  );
}
