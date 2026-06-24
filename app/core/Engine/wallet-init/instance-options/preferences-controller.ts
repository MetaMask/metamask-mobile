import type { PreferencesState } from '@metamask/preferences-controller';
import type { WalletOptions } from '@metamask/wallet';
import AppConstants from '../../../AppConstants';

type WalletState = NonNullable<WalletOptions['state']>;
type PreferencesControllerInitialState = Partial<PreferencesState>;

/**
 * Seed the wallet-owned `PreferencesController` with mobile's default
 * preferences. The package controller takes no instance options, so these
 * defaults are passed as initial state instead. Persisted state is spread last
 * so a returning user's saved preferences win over the defaults.
 *
 * @param state - The full initial wallet state, including any persisted
 * `PreferencesController` slice.
 * @returns The seeded `PreferencesController` initial state.
 */
export function getPreferencesControllerInitialState(
  state: WalletState,
): PreferencesControllerInitialState {
  // The wallet types its `state` slots as `Record<string, Json>`; narrow the
  // persisted slice back to the controller's own shape so reads are typed.
  const persistedState = state.PreferencesController as
    | Partial<PreferencesState>
    | undefined;

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
