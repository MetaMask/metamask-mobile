import { strings } from '../../locales/i18n';

export const CHOOSE_PASSWORD_STEPS = [
	strings('choose_password.title'),
	strings('choose_password.secure'),
	strings('choose_password.confirm')
];

export const MANUAL_BACKUP_STEPS = [
	strings('manual_backup.progressOne'),
	strings('manual_backup.progressTwo'),
	strings('manual_backup.progressThree')
];

export const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
export const SEED_PHRASE = 'seed_phrase';
export const CONFIRM_PASSWORD = 'confirm_password';

export const ONBOARDING_SCAN_STEPS = [1, 2, 3, 4].map(val => ({
	id: `${val}`,
	val,
	step: strings(`onboarding.scan_step_${val}`)
}));
