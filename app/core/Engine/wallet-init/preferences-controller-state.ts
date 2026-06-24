import type { WalletOptions } from '@metamask/wallet';
import AppConstants from '../../AppConstants';

type WalletState = NonNullable<WalletOptions['state']>;
type PreferencesControllerInitialState = NonNullable<
  WalletState['PreferencesController']
>;

/**
 * Seed the wallet-owned `PreferencesController` with mobile's default
 * preferences. The package `PreferencesController` exposes no instance options,
 * so mobile's client-specific defaults (IPFS gateway, detection toggles, smart
 * transactions opt-in, token sort order) are passed as initial state instead.
 *
 * Persisted state is spread last so a returning user's saved preferences always
 * win over the defaults — mirroring the behaviour of the standalone
 * `preferences-controller-init.ts` this replaces.
 *
 * @param state - The full initial wallet state, including any persisted
 * `PreferencesController` slice.
 * @returns The seeded `PreferencesController` initial state.
 */
export function getPreferencesControllerInitialState(
  state: WalletState,
): PreferencesControllerInitialState {
  const persistedState = state.PreferencesController;

  return {
    ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
    useTokenDetection: persistedState?.useTokenDetection ?? true,
    useNftDetection: true,
    displayNftMedia: true,
    securityAlertsEnabled: true,
    smartTransactionsOptInStatus: true,
    tokenSortConfig: {
      key: 'tokenFiatAmount',
      order: 'dsc',
      sortCallback: 'stringNumeric',
    },
    ...persistedState,
  };
}
