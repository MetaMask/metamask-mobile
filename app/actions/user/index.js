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
