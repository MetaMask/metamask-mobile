export function passwordSet() {
	return {
		type: 'PASSWORD_SET'
	};
}

export function passwordUnset() {
	return {
		type: 'PASSWORD_UNSET'
	};
}

export function seedphraseBackedUp() {
	return {
		type: 'SEEDPHRASE_BACKED_UP'
	};
}

export function seedphraseNotBackedUp() {
	return {
		type: 'SEEDPHRASE_NOT_BACKED_UP'
	};
}

export function onboardingWizardExplored(onboardingWizardExplored) {
	return {
		type: 'ONBOARDING_WIZARD_EXPLORED',
		onboardingWizardExplored
	};
}

export function metricsOptIn(metricsOptIn) {
	return {
		type: 'METRICS_OPT_IN',
		metricsOptIn
	};
}
