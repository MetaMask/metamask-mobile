import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, ScrollView, View, Switch, InteractionManager } from 'react-native';
import StyledButton from '../../../UI/StyledButton';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import Engine from '../../../../core/Engine';
import { useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import AnalyticsV2 from '../../../../util/analyticsV2';

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
	switchElement: {
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
	const isTokenDetectionEnabled = useSelector(
		(state: any) => !state.engine.backgroundState.PreferencesController.useStaticTokenList
	);
	const isMainnet = useSelector(
		(state: any) => state.engine.backgroundState.NetworkController.provider.type === MAINNET
	);
	const chainId = useSelector((state: any) => state.engine.backgroundState.NetworkController.provider.chainId);

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

	const toggleTokenDetection = useCallback(
		(enabled) => {
			const { PreferencesController } = Engine.context as any;
			const eventOn = AnalyticsV2.ANALYTICS_EVENTS.SETTINGS_TOKEN_DETECTION_ON;
			const eventOff = AnalyticsV2.ANALYTICS_EVENTS.SETTINGS_TOKEN_DETECTION_OFF;
			PreferencesController.setUseStaticTokenList(!enabled);
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent((enabled ? eventOn : eventOff) as any, {
					chain_id: chainId,
				});
			});
		},
		[chainId]
	);

	const renderTokenDetectionSection = useCallback(
		() =>
			isMainnet ? (
				<View style={styles.setting} testID={'token-detection-section'}>
					<Text style={styles.title}>{strings('app_settings.token_detection_title')}</Text>
					<Text style={styles.desc}>{strings('app_settings.token_detection_description')}</Text>
					<View style={styles.switchElement}>
						<Switch
							value={isTokenDetectionEnabled}
							onValueChange={toggleTokenDetection}
							trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : undefined}
							ios_backgroundColor={colors.grey000}
						/>
					</View>
				</View>
			) : null,
		[isTokenDetectionEnabled, toggleTokenDetection, isMainnet]
	);

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
			{renderTokenDetectionSection()}
		</ScrollView>
	);
};

export default ExperimentalSettings;
