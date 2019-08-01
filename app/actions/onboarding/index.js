/**
 * Saves an onboarding analytics event in state
 *
 * @param {object} event - Event object
 */
export function saveOnboardingEvent(event) {
	return {
		type: 'SAVE_EVENT',
		event
	};
}

/**
 * Erases any event stored in state
 */
export function eraseOnboardingEvent() {
	return {
		type: 'SAVE_EVENT',
		event: undefined
	};
}
