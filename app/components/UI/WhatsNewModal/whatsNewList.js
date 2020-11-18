import { strings } from '../../../../locales/i18n';

export const whatsNew = [
	{
		// All users that have <1.0.7 and are updating to >=1.0.7 should see
		onlyUpdates: true, // Only users who updated the app will see this, not newly installs
		maxLastAppVersion: '1.0.7', // Only users who had a previous version <1.0.7 version will see this
		minAppVersion: '1.0.7', // Only users who updated to a version >= 1.0.7 will see this
		features: [
			{
				title: strings('whats_new.feature_security_settings_title'),
				text: strings('whats_new.feature_security_settings_text'),
				buttonText: strings('whats_new.feature_security_settings_button'),
				buttonPress: props => props.navigation.navigate('SecuritySettings'),
				image: require('../../../images/whats-new-security.png')
			}
		]
	}
];

export default whatsNew;
