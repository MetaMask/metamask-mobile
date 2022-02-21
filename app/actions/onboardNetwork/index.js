/**
 * Handle the onboarding network action
 *
 * @param {object} data object containing the event data
 * @returns
 */
export const onboardNetworkAction = (data) => ({
	type: 'NETWORK_ONBOARDED',
	payload: data,
});

export const showNetworkOnboardingAction = ({ networkUrl, networkType, nativeToken }) => ({
	type: 'SHOW_NETWORK_ONBOARDING',
	networkUrl,
	networkType,
	nativeToken,
});
