export function approveHost(hostname) {
	return {
		type: 'APPROVE_HOST',
		hostname,
	};
}

export function rejectHost(hostname) {
	return {
		type: 'REJECT_HOST',
		hostname,
	};
}

export function clearHosts() {
	return { type: 'CLEAR_HOSTS' };
}

export function setPrivacyMode(enabled) {
	return {
		type: 'SET_PRIVACY_MODE',
		enabled,
	};
}

export function setThirdPartyApiMode(enabled) {
	return {
		type: 'SET_THIRD_PARTY_API_MODE',
		enabled,
	};
}
