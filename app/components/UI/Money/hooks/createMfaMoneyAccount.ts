const STUB_DELAY_MS = 2000;

/**
 * Creates the MPC Money account that 2-step verification protects.
 *
 * Placeholder until the MPC keyring lands in MoneyAccountController
 * (core#10694, MFA-789): resolves after a short delay so the setting-up
 * state can be exercised.
 */
export const createMfaMoneyAccount = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, STUB_DELAY_MS));
