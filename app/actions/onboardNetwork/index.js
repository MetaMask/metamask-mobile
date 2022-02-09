/**
 * Handle the onboarding network action
 *
 * @param {object} data object containing the event data
 * @returns
 */
const onboardNetworkAction = (data) => ({
	type: 'NETWORK_ONBOARDED',
	payload: data,
});

export default onboardNetworkAction;
