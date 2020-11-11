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

export function backUpSeedphraseAlertVisible() {
	return {
		type: 'BACK_UP_SEEDPHRASE_VISIBLE'
	};
}

export function backUpSeedphraseAlertNotVisible() {
	return {
		type: 'BACK_UP_SEEDPHRASE_NOT_VISIBLE'
	};
}

export function protectWalletModalVisible() {
	return {
		type: 'PROTECT_MODAL_VISIBLE'
	};
}

export function protectWalletModalNotVisible() {
	return {
		type: 'PROTECT_MODAL_NOT_VISIBLE'
	};
}

export function requiredProtectWalletModalVisible() {
	return {
		type: 'REQUIRED_PROTECT_WALLET_MODAL_VISIBLE'
	};
}

export function requiredProtectWalletModalNotVisible() {
	return {
		type: 'REQUIRED_PROTECT_WALLET_MODAL_NOT_VISIBLE'
	};
}
