export const whatsNew = [
	{
		// All users that have <1.0.5 and are updating to >=1.0.5 should see
		onlyUpdates: true, // Only users who updated the app will see this, not newly installs
		maxLastAppVersion: '1.0.5', // Only users who had a previous version <1.0.5 version will see this
		minAppVersion: '1.0.5', // Only users who updated to a version >= 1.0.5 will see this
		features: [
			{
				title: 'New seed phrase back up design',
				text:
					'In Security & Privacy, find the option to backup your seedphrase again & reset your password. Take these wallet security measures now.',
				buttonText: 'Back up now',
				buttonPress: props => props.navigation.navigate('SecuritySettings')
			},
			{
				title: 'It’s now easier to change password',
				text: 'In Security & Privacy, you can now change your password from within the app. Try it now.',
				buttonText: 'Visit in settings',
				buttonPress: props => props.navigation.navigate('SecuritySettings')
			}
		]
	}
];

export default whatsNew;
