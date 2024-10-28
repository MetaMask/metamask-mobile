/**
 * Handle the onboarding network action
 *
 * @param {object} chainId - The chain ID of the current selected network
 * @returns
 */
export const onboardNetworkAction = (chainId: string) => ({
  type: 'NETWORK_ONBOARDED',
  payload: chainId,
});

export const networkSwitched = ({
  networkUrl,
  networkStatus,
}: {
  networkUrl: string;
  networkStatus: boolean;
}) => ({
  type: 'NETWORK_SWITCHED',
  networkUrl,
  networkStatus,
});

export const showNetworkOnboardingAction = ({
  networkUrl,
  networkType,
  nativeToken,
  showNetworkOnboarding,
}: {
  networkUrl: string;
  networkType: string;
  nativeToken: string;
  showNetworkOnboarding: boolean;
}) => ({
  type: 'SHOW_NETWORK_ONBOARDING',
  networkUrl,
  networkType,
  nativeToken,
  showNetworkOnboarding,
});

/**
 * Set or update the connection's request source for the network.
 *
 * @param {string} hostname - The hostname for which to set the request source.
 * @param {string} source - The connection's request source.
 * @returns
 */
export const setRequestSource = (hostname: string, source: string) => ({
  type: 'SET_REQUEST_SOURCE',
  payload: { hostname, source },
});
