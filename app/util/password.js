const MIN_PASSWORD_LENGTH = 8;
export const getPasswordStrengthWord = strength => {
	switch (strength) {
		case 0:
			return 'weak';
		case 1:
			return 'weak';
		case 2:
			return 'weak';
		case 3:
			return 'good';
		case 4:
			return 'strong';
	}
};

export const passwordRequirementsMet = password => password.length >= MIN_PASSWORD_LENGTH;
