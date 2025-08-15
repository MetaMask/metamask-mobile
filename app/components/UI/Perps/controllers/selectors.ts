import type { PerpsControllerState } from './PerpsController';

/**
 * Select whether the user is a first-time perps user
 * @param state - PerpsController state
 * @returns true if user is first-time, false otherwise
 */
export const selectIsFirstTimeUser = (
  state: PerpsControllerState | undefined,
): boolean => {
  if (state?.isTestnet) {
    return state?.isFirstTimeUser?.testnet ?? true;
  }
  return state?.isFirstTimeUser?.mainnet ?? true;
};
