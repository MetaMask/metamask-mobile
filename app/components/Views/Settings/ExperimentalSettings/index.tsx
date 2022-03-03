import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import StyledButton from '../../../UI/StyledButton';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 24,
		paddingBottom: 48,
	},
	title: {
		...(fontStyles.normal as any),
		color: colors.fontPrimary,
		fontSize: 20,
		lineHeight: 20,
		paddingTop: 4,
		marginTop: -4,
	},
	desc: {
		...(fontStyles.normal as any),
		color: colors.grey500,
		fontSize: 14,
		lineHeight: 20,
		marginTop: 12,
	},
	setting: {
		marginVertical: 18,
	},
	clearHistoryConfirm: {
		marginTop: 18,
	},
});

interface Props {
	/**
	/* navigation object required to push new views
	*/
	navigation: any;
	/**
	 * contains params that are passed in from navigation
	 */
	route: any;
}

/**
 * Main view for app Experimental Settings
 */
const ExperimentalSettings = ({ navigation, route }: Props) => {
	const isFullScreenModal = route?.params?.isFullScreenModal;

	useEffect(
		() => {
			navigation.setOptions(
				getNavigationOptionsTitle(strings('app_settings.experimental_title'), navigation, isFullScreenModal)
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const goToWalletConnectSessions = useCallback(() => {
		navigation.navigate('WalletConnectSessionsView');
	}, [navigation]);

	return (
		<ScrollView style={styles.wrapper}>
			<View style={styles.setting}>
				<View>
					<Text style={styles.title}>{strings('experimental_settings.wallet_connect_dapps')}</Text>
					<Text style={styles.desc}>{strings('experimental_settings.wallet_connect_dapps_desc')}</Text>
					<StyledButton
						type="normal"
						onPress={goToWalletConnectSessions}
						containerStyle={styles.clearHistoryConfirm}
					>
						{strings('experimental_settings.wallet_connect_dapps_cta')}
					</StyledButton>
				</View>
			</View>
		</ScrollView>
	);
};

export default ExperimentalSettings;
