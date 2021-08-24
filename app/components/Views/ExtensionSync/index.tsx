import React, { useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Image, InteractionManager } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { colors, fontStyles } from '../../../styles/common';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import StyledButton from '../../UI/StyledButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import PubNubWrapper from '../../../util/syncWithExtension';
import { useRef } from 'react';
import Logger from '../../../util/Logger';
import AnalyticsV2 from '../../../util/analyticsV2';
import Analytics from '../../../core/Analytics';
import DefaultPreference from 'react-native-default-preference';
import PreventScreenshot from '../../../core/PreventScreenshot';
import {
    EXISTING_USER,
	METRICS_OPT_IN,
	SEED_PHRASE_HINTS,
	BIOMETRY_CHOICE,
	BIOMETRY_CHOICE_DISABLED,
	NEXT_MAKER_REMINDER,
	TRUE,
} from '../../../constants/storage';
import AsyncStorage from '@react-native-community/async-storage';
import SecureKeychain from '../../../core/SecureKeychain';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';

type Props = {
    // Selector
    passwordSet: any
    // Dispatcher
    saveOnboardingEvent: any;
    unsetLoading: any,
    setLoading: any;
    passwordHasBeenSet: any, seedphraseBackedUp: any, setLockTime: any,
};

const ExtensionSync = ({ navigation, route }: any) => {
	const { selectedAddress, unsetLoading, saveOnboardingEvent, setLoading, passwordHasBeenSet, seedphraseBackedUp, setLockTime, passwordSet } = route.params;
	const pubnubWrapperRef = useRef<any>(null);
	const mountedRef = useRef(true);
    const passwordRef = useRef(null);
    const seedWordsRef = useRef(null);
    const importedAccountsRef = useRef(null);
    const dataToSyncRef = useRef(null);

	useEffect(() => {
		// Set navigation options
		navigation.setOptions(getOnboardingNavbarOptions(navigation, route));
		// Unmount
		return () => {
			mountedRef.current = false;
			pubnubWrapperRef.current?.disconnectWebsockets?.();
			unsetLoading();
			InteractionManager.runAfterInteractions(PreventScreenshot.allow);
		};
	}, [navigation, route, mountedRef, pubnubWrapperRef, unsetLoading]);

	const track = useCallback((...eventArgs) => {
		InteractionManager.runAfterInteractions(async () => {
			if (Analytics.getEnabled()) {
				AnalyticsV2.trackEvent(...eventArgs);
				return;
			}
			const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
			if (!metricsOptIn) {
				saveOnboardingEvent(eventArgs);
			}
		});
	}, [saveOnboardingEvent]);

    const finishSync = useCallback(async opts => {
		if (opts.biometrics) {
			try {
				await SecureKeychain.setGenericPassword(opts.password, SecureKeychain.TYPES.BIOMETRICS);
			} catch (e) {
				await SecureKeychain.resetGenericPassword();
			}
		} else {
			await SecureKeychain.resetGenericPassword();
		}

		try {
			await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
			await Engine.resetState();
			await Engine.sync({
				...dataToSyncRef.current,
				seed: seedWordsRef.current,
				importedAccounts: importedAccountsRef.current,
				pass: opts.password
			});
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			passwordHasBeenSet();
			setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
			seedphraseBackedUp();
			dataToSyncRef.current = null;
			track(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SYNC_SUCCESSFUL);
			track(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_COMPLETED, {
				wallet_setup_type: 'sync',
				new_wallet: false
			});

			navigation.push('SyncWithExtensionSuccess');
			unsetLoading();
		} catch (e) {
			track(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_FAILURE, {
				wallet_setup_type: 'sync',
				error_type: e.toString()
			});
			Logger.error(e, 'Sync::disconnect');
			Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
			unsetLoading();
			navigation.goBack();
		}
	}, [unsetLoading, ]);

    const disconnect = useCallback(async () => {
		let password;
		try {
			// If there's a password set, let's keep it
			if (passwordSet) {
				// This could also come from the previous step if it's a first time user
				const credentials = await SecureKeychain.getGenericPassword();
				if (credentials) {
					password = credentials.password;
				} else {
					password = passwordRef.current;
				}
				// Otherwise use the password from the extension
			} else {
				password = passwordRef.current;
			}
		} catch (e) {
			password = passwordRef.current;
		}

		if (password === passwordRef.current) {
			let biometryType = await SecureKeychain.getSupportedBiometryType();
			if (biometryType) {
				if (Device.isAndroid()) biometryType = 'biometrics';
				Alert.alert(
					strings('sync_with_extension.allow_biometrics_title', { biometrics: biometryType }),
					strings('sync_with_extension.allow_biometrics_desc', { biometrics: biometryType }),
					[
						{
							text: strings('sync_with_extension.warning_cancel_button'),
							onPress: async () => {
								await AsyncStorage.removeItem(BIOMETRY_CHOICE);
								await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
								finishSync({ biometrics: false, password });
							},
							style: 'cancel'
						},
						{
							text: strings('sync_with_extension.warning_ok_button'),
							onPress: async () => {
								await AsyncStorage.setItem(BIOMETRY_CHOICE, biometryType);
								await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
								finishSync({ biometrics: true, biometryType, password });
							}
						}
					],
					{ cancelable: false }
				);
			} else {
				finishSync({ biometrics: false, password });
			}
		} else {
			finishSync({ biometrics: false, password });
		}
	}, [finishSync, passwordSet, passwordRef])

	const initWebsockets = useCallback(() => {
		mountedRef.current && setLoading(strings('sync_with_extension.please_wait'));

		pubnubWrapperRef.current?.addMessageListener?.(
			() => {
				Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
				track(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_FAILURE, {
					wallet_setup_type: 'sync',
					error_type: 'onErrorSync'
				});
				unsetLoading();
				return false;
			},
			data => {
				// this.incomingDataStr = null;
				const { pwd, seed, importedAccounts } = data.udata;
				passwordRef.current = pwd;
				seedWordsRef.current = seed;
				importedAccountsRef.current = importedAccounts;
				delete data.udata;
				dataToSyncRef.current = { ...data };
				pubnubWrapperRef.current?.endSync?.(disconnect);
			}
		);

		pubnubWrapperRef.current?.subscribe?.();
	}, [pubnubWrapperRef, passwordRef, track, unsetLoading, disconnect]);

	const startSync = useCallback(
		async firstAttempt => {
			try {
				initWebsockets();
				await pubnubWrapperRef.current?.startSync?.();
				return true;
			} catch (e) {
				unsetLoading();
				if (!firstAttempt) {
					if (e.message === 'Sync::timeout') {
						Alert.alert(
							strings('sync_with_extension.outdated_qr_code'),
							strings('sync_with_extension.outdated_qr_code_desc')
						);
					} else {
						Alert.alert(
							strings('sync_with_extension.something_wrong'),
							strings('sync_with_extension.something_wrong_desc')
						);
					}
				}
				Logger.error(e, { message: 'Sync::startSync', firstAttempt });
				track(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_FAILURE, {
					wallet_setup_type: 'sync',
					error_type: e.message()
				});
				return false;
			}
		},
		[initWebsockets, pubnubWrapperRef, track, unsetLoading]
	);

	const onStartScan = useCallback(
		async data => {
			if (data.content && data.content.search('metamask-sync:') !== -1) {
				const [channelName, cipherKey] = data.content.replace('metamask-sync:', '').split('|@|');
				pubnubWrapperRef.current = new PubNubWrapper(channelName, cipherKey);
				await pubnubWrapperRef.current?.establishConnection?.(selectedAddress);
			} else {
				Alert.alert(
					strings('sync_with_extension.invalid_qr_code'),
					strings('sync_with_extension.invalid_qr_code_desc')
				);
			}
		},
		[selectedAddress]
	);

	const onScanSuccess = useCallback(async data => {
		if (data.content && data.content.search('metamask-sync:') !== -1) {
			(await startSync(true)) || (await startSync(false));
		} else {
			Alert.alert(
				strings('sync_with_extension.invalid_qr_code'),
				strings('sync_with_extension.invalid_qr_code_desc')
			);
		}
	}, []);

	const triggerScan = useCallback(() => {
		navigation.push('QRScanner', {
			onStartScan,
			onScanSuccess
		});
	}, [onStartScan, onScanSuccess]);

	const renderSyncImage = useCallback(() => {
		return <Image style={styles.syncImage} source={require('../../../images/sync-icon.png')} />;
	}, []);

	const renderTitle = useCallback(() => {
		return <Text style={styles.titleLabel}>{'Steps to sync with MetaMask extension'}</Text>;
	}, []);

	const renderSteps = useCallback(() => {
		const steps = [
			'Open the extension on desktop',
			'Go to Settings > Advanced',
			'Click on "Sync with Mobile"',
			'Scan the QR code to start syncing'
		];
		return (
			<View style={styles.stepsContainer}>
				{steps.map((step, index) => {
					const key = `step-${index}`;
					const text = `${index + 1}. ${step}`;
					return (
						<Text style={styles.stepLabel} key={key}>
							{text}
						</Text>
					);
				})}
			</View>
		);
	}, []);

	const renderScanButton = useCallback(() => {
		return (
			<StyledButton type={'blue'} onPress={triggerScan} testID={'create-wallet-button'}>
				{'Scan'}
			</StyledButton>
		);
	}, [triggerScan]);

	return (
		<SafeAreaView edges={['bottom']} style={styles.container}>
			<View style={styles.fill}>
				{renderSyncImage()}
				{renderTitle()}
				{renderSteps()}
			</View>
			{renderScanButton()}
		</SafeAreaView>
	);
};

// Reference: https://medium.com/@remi.gallego/use-navigationoptions-with-a-functional-component-in-react-native-d58ff15f3bdd
// ExtensionSync.navigationOptions = ({ navigation, route }) => getOnboardingNavbarOptions(navigation, route);

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
		paddingHorizontal: 16,
		justifyContent: 'space-between',
		paddingBottom: 16
	},
	fill: {
		flex: 1
	},
	syncImage: {
		height: 44,
		marginTop: 48,
		width: 112,
		alignSelf: 'center'
	},
	titleLabel: {
		textAlign: 'center',
		color: colors.black,
		fontSize: 24,
		fontFamily: fontStyles.bold.fontFamily,
		marginTop: 32
	},
	stepsContainer: {
		marginTop: 32
	},
	stepLabel: {
		color: colors.black,
		fontSize: 16,
		fontFamily: fontStyles.normal.fontFamily,
		marginBottom: 8
	}
});

export default ExtensionSync;
