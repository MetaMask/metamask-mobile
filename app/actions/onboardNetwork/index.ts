/**
 * Handle the onboarding network action
 *
 * @param {object} data object containing the event data
 * @returns
 */
export const onboardNetworkAction = (data: string) => ({
  type: 'NETWORK_ONBOARDED',
  payload: data,
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
