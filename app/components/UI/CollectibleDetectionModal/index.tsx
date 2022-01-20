import React from 'react';
import { StyleSheet, View } from 'react-native';
import Alert, { AlertType } from '../../Base/Alert';
import Text from '../../Base/Text';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	alertBar: {
		width: '95%',
		marginBottom: 15,
	},
	alertText: {
		paddingBottom: 20,
	},
});

interface Props {
	onDismiss: () => void;
	navigation: any;
}

const CollectibleDetectionModal = ({ onDismiss, navigation }: Props) => {
	const goToSecuritySettings = () => {
		navigation.navigate('SettingsView', {
			screen: 'SecuritySettings',
			params: {
				isFullScreenModal: true,
			},
		});
	};

	return (
		<View style={styles.alertBar}>
			<Alert small onDismiss={onDismiss} type={AlertType.Info}>
				<Text style={styles.alertText} bold small>
					{strings('wallet.nfts_autodetection_title')}
				</Text>
				{'\n'}
				<Text style={styles.alertText} small>
					{strings('wallet.nfts_autodetection_desc')}
				</Text>
				{'\n'}
				<Text style={styles.alertText} link bold small onPress={goToSecuritySettings}>
					{strings('wallet.nfts_autodetection_cta')}
				</Text>
			</Alert>
		</View>
	);
};

export default CollectibleDetectionModal;
