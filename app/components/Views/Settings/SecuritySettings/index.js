import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Alert, StyleSheet, Switch, Text, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import ActionModal from '../../../UI/ActionModal';
import SecureKeychain from '../../../../core/SecureKeychain';
import SelectComponent from '../../../UI/SelectComponent';
import StyledButton from '../../../UI/StyledButton';
import SettingsNotification from '../../../UI/SettingsNotification';
import { clearHistory } from '../../../../actions/browser';
import { clearHosts, setPrivacyMode, setThirdPartyApiMode } from '../../../../actions/privacy';
import { colors, fontStyles } from '../../../../styles/common';
import Logger from '../../../../util/Logger';
import Device from '../../../../util/Device';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { setLockTime } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import Analytics from '../../../../core/Analytics';
import { passwordSet } from '../../../../actions/user';
import Engine from '../../../../core/Engine';
import AppConstants from '../../../../core/AppConstants';
import {
	EXISTING_USER,
	BIOMETRY_CHOICE,
	BIOMETRY_CHOICE_DISABLED,
	PASSCODE_CHOICE,
	PASSCODE_DISABLED,
	TRUE,
	SEED_PHRASE_HINTS
} from '../../../../constants/storage';
import CookieManager from '@react-native-community/cookies';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 24,
		paddingBottom: 48
	},
	title: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 20,
		lineHeight: 20
	},
	desc: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 14,
		lineHeight: 20,
		marginTop: 12
	},
	switchElement: {
		marginTop: 18
	},
	setting: {
		marginTop: 50
	},
	firstSetting: {
		marginTop: 0
	},
	modalView: {
		alignItems: 'center',
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		padding: 20
	},
	modalText: {
		...fontStyles.normal,
		fontSize: 18,
		textAlign: 'center'
	},
	modalTitle: {
		...fontStyles.bold,
		fontSize: 22,
		textAlign: 'center',
		marginBottom: 20
	},
	Confirm: {
		marginTop: 18
	},
	Protect: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	fifty: {
		width: '48%'
	},
	red: {
		color: colors.red
	},
	inner: {
		paddingBottom: 112
	},
	picker: {
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		marginTop: 16
	},
	warningText: {
		color: colors.black,
		fontSize: 12
	},
	warningTextRed: {
		color: colors.red
	},
	warningTextGreen: {
		color: colors.black
	},
	warningBold: {
		...fontStyles.bold,
		color: colors.blue,
		marginLeft: 'auto'
	}
});

/**
 * Main view for app configurations
 */
class Settings extends PureComponent {
	static propTypes = {
		/**
		 * Indicates whether privacy mode is enabled
		 */
		privacyMode: PropTypes.bool,
		/**
		 * Called to toggle privacy mode
		 */
		setPrivacyMode: PropTypes.func,
		/**`
		 * Called to toggle set party api mode
		 */
		setThirdPartyApiMode: PropTypes.func,
		/**
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool,
		/**
		 * Boolean that determines if the user has set a password before
		 */
		passwordHasBeenSet: PropTypes.bool,
		/**
		 * Called to set the passwordSet flag
		 */
		passwordSet: PropTypes.func,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Map of hostnames with approved account access
		 */
		approvedHosts: PropTypes.object,
		/**
		 * Called to clear all hostnames with account access
		 */
		clearHosts: PropTypes.func,
		/**
		 * Array of visited websites
		 */
		browserHistory: PropTypes.array,
		/**
		 * Called to clear the list of visited urls
		 */
		clearBrowserHistory: PropTypes.func,
		/**
		 * Called to set the active search engine
		 */
		setLockTime: PropTypes.func,
		/**
		 * Active search engine
		 */
		lockTime: PropTypes.number,
		/**
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		seedphraseBackedUp: PropTypes.bool
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.security_title'), navigation);

	state = {
		approvalModalVisible: false,
		biometryChoice: null,
		biometryType: null,
		browserHistoryModalVisible: false,
		cookiesModalVisible: false,
		metricsOptIn: false,
		passcodeChoice: false
	};

	autolockOptions = [
		{
			value: '0',
			label: strings('app_settings.autolock_immediately'),
			key: '0'
		},
		{
			value: '5000',
			label: strings('app_settings.autolock_after', { time: 5 }),
			key: '5000'
		},
		{
			value: '15000',
			label: strings('app_settings.autolock_after', { time: 15 }),
			key: '15000'
		},
		{
			value: '30000',
			label: strings('app_settings.autolock_after', { time: 30 }),
			key: '30000'
		},
		{
			value: '60000',
			label: strings('app_settings.autolock_after', { time: 60 }),
			key: '60000'
		},
		{
			value: '300000',
			label: strings('app_settings.autolock_after_minutes', { time: 5 }),
			key: '300000'
		},
		{
			value: '600000',
			label: strings('app_settings.autolock_after_minutes', { time: 10 }),
			key: '600000'
		},
		{
			value: '-1',
			label: strings('app_settings.autolock_never'),
			key: '-1'
		}
	];

	componentDidMount = async () => {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		const currentSeedphraseHints = await AsyncStorage.getItem(SEED_PHRASE_HINTS);

		let bioEnabled = false;
		let passcodeEnabled = false;
		if (biometryType) {
			const biometryChoice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
			if (biometryChoice !== '' && biometryChoice === biometryType) {
				bioEnabled = true;
			} else {
				const passcodeChoice = await AsyncStorage.getItem(PASSCODE_CHOICE);
				if (passcodeChoice !== '' && passcodeChoice === TRUE) {
					passcodeEnabled = true;
				}
			}
		}
		const metricsOptIn = Analytics.getEnabled();
		this.setState({
			biometryType,
			biometryChoice: bioEnabled,
			metricsOptIn,
			passcodeChoice: passcodeEnabled,
			currentSeedphraseHints
		});
	};

	onSecuritySettingChange = async (enabled, type) => {
		if (type === 'biometrics') {
			this.setState({ biometryChoice: enabled });

			// If we're disabling biometrics, let's enable device passcode / pin
			//  by default because if we disable both we lose the password
			if (!enabled) {
				await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
				this.onSecuritySettingChange(true, 'passcode');
				return;
			}

			await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
			await AsyncStorage.removeItem(PASSCODE_DISABLED);

			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials && credentials.password !== '') {
				this.storeCredentials(credentials.password, enabled, false, type);
			} else if (this.props.passwordHasBeenSet) {
				this.props.navigation.navigate('EnterPasswordSimple', {
					onPasswordSet: password => {
						this.storeCredentials(password, true, false, type, true);
					}
				});
			} else {
				this.props.navigation.navigate('ChoosePasswordSimple', {
					onPasswordSet: password => {
						this.storeCredentials(password, enabled, true, type);
					}
				});
			}
		} else {
			this.setState({ passcodeChoice: enabled });

			if (!enabled) {
				await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
			} else {
				await AsyncStorage.removeItem(PASSCODE_DISABLED);
			}

			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials && credentials.password !== '') {
				this.storeCredentials(credentials.password, enabled, false, type);
			} else if (this.props.passwordHasBeenSet) {
				this.props.navigation.navigate('EnterPasswordSimple', {
					onPasswordSet: password => {
						this.storeCredentials(password, true, false, type, true);
					}
				});
			} else {
				this.props.navigation.navigate('ChoosePasswordSimple', {
					onPasswordSet: password => {
						this.storeCredentials(password, enabled, true, type);
					}
				});
			}
		}
	};

	storeCredentials = async (password, enabled, restore, type, validate = false) => {
		try {
			await SecureKeychain.resetGenericPassword();

			if (restore) {
				Logger.log('SecuritySettings::Restoring wallet from SecuritySettings after setting password');
				// We have to restore the entire keyring
				// to re-encrypt it with a new password
				const { KeyringController, PreferencesController } = Engine.context;
				const { keyrings, selectedAddress } = this.props;
				const mnemonic = await KeyringController.exportSeedPhrase('');
				const seed = JSON.stringify(mnemonic).replace(/"/g, '');

				// Also regenerate the accounts
				let accountLength = 1;
				const allKeyrings =
					keyrings && keyrings.length ? keyrings : Engine.context.KeyringController.state.keyrings;
				for (const keyring of allKeyrings) {
					if (keyring.type === 'HD Key Tree') {
						accountLength = keyring.accounts.length;
						break;
					}
				}
				Logger.log('SecuritySettings::Got the account count');
				await KeyringController.createNewVaultAndRestore(password, seed);
				Logger.log('SecuritySettings::Keyring created and re-encrypted');
				for (let i = 0; i < accountLength - 1; i++) {
					await KeyringController.addNewAccount();
				}
				Logger.log('SecuritySettings::selecting address');
				// Finally set the same selected address
				PreferencesController.setSelectedAddress(selectedAddress);
				Logger.log('SecuritySettings::restore complete');
			}

			// When there's no need to restore and we just need
			// to store the existing password in the keychain,
			// we need to validate it first
			if (validate) {
				await Engine.context.KeyringController.exportSeedPhrase(password);
			}

			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			if (enabled) {
				const authOptions = {
					accessControl:
						type === 'biometrics'
							? SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
							: SecureKeychain.ACCESS_CONTROL.DEVICE_PASSCODE
				};
				await SecureKeychain.setGenericPassword('metamask-user', password, authOptions);

				if (type === 'biometrics') {
					await AsyncStorage.setItem(BIOMETRY_CHOICE, this.state.biometryType);
					await AsyncStorage.removeItem(PASSCODE_CHOICE);
					// If the user enables biometrics, we're trying to read the password
					// immediately so we get the permission prompt
					if (Device.isIos()) {
						await SecureKeychain.getGenericPassword();
					}
				} else {
					await AsyncStorage.setItem(PASSCODE_CHOICE, TRUE);
					await AsyncStorage.removeItem(BIOMETRY_CHOICE);
				}
			} else {
				await AsyncStorage.removeItem(BIOMETRY_CHOICE);
				await AsyncStorage.removeItem(PASSCODE_CHOICE);
			}

			this.props.passwordSet();

			if (enabled && this.props.lockTime === -1) {
				Logger.log('Setting locktime to ', AppConstants.DEFAULT_LOCK_TIMEOUT);
				this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
			} else {
				Logger.log('Locktime was set to', this.props.lockTime);
			}
		} catch (e) {
			if (e.message === 'Invalid password') {
				Alert.alert(strings('app_settings.invalid_password'), strings('app_settings.invalid_password_message'));
			}
			Logger.error(e, 'SecuritySettings:biometrics');
			// Return the switch to the previous value
			if (type === 'biometrics') {
				this.setState({ biometryChoice: !enabled });
			} else {
				this.setState({ passcodeChoice: !enabled });
			}
		}
	};

	toggleClearApprovalsModal = () => {
		this.setState({ approvalModalVisible: !this.state.approvalModalVisible });
	};

	toggleClearBrowserHistoryModal = () => {
		this.setState({ browserHistoryModalVisible: !this.state.browserHistoryModalVisible });
	};

	toggleClearCookiesModal = () => {
		this.setState({ cookiesModalVisible: !this.state.cookiesModalVisible });
	};

	clearApprovals = () => {
		this.props.clearHosts();
		this.toggleClearApprovalsModal();
	};

	clearBrowserHistory = () => {
		this.props.clearBrowserHistory();
		this.toggleClearBrowserHistoryModal();
	};

	clearCookies = () => {
		CookieManager.clearAll().then(() => {
			Logger.log('Browser cookies cleared');
			this.toggleClearCookiesModal();
		});
	};

	togglePrivacy = value => {
		this.props.setPrivacyMode(value);
	};

	toggleThirdPartyAPI = value => {
		this.props.setThirdPartyApiMode(value);
	};

	toggleMetricsOptIn = async value => {
		if (value) {
			Analytics.enable();
			this.setState({ metricsOptIn: true });
		} else {
			Analytics.disable();
			this.setState({ metricsOptIn: false });
			Alert.alert(
				strings('app_settings.metametrics_opt_out'),
				strings('app_settings.metrametrics_restart_required')
			);
		}
	};

	goToRevealPrivateCredential = () => {
		this.props.navigation.navigate('RevealPrivateCredentialView', { privateCredentialName: 'seed_phrase' });
	};

	goToExportPrivateKey = () => {
		this.props.navigation.navigate('RevealPrivateCredentialView', { privateCredentialName: 'private_key' });
	};

	selectLockTime = lockTime => {
		this.props.setLockTime(parseInt(lockTime, 10));
	};

	manualBackup = () => {
		this.props.navigation.navigate('ManualBackupStep1');
	};

	render = () => {
		const { approvedHosts, seedphraseBackedUp, browserHistory, privacyMode, thirdPartyApiMode } = this.props;
		const {
			approvalModalVisible,
			biometryType,
			browserHistoryModalVisible,
			cookiesModalVisible,
			metricsOptIn,
			currentSeedphraseHints
		} = this.state;
		const { accounts, identities, selectedAddress } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };
		return (
			<ScrollView style={styles.wrapper} testID={'security-settings-scrollview'}>
				<View style={styles.inner}>
					<View style={[styles.setting, styles.firstSetting]}>
						<Text style={styles.title}>{strings('app_settings.protect_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.protect_desc')}</Text>
						<SettingsNotification isWarning={!seedphraseBackedUp}>
							<Text
								style={[
									styles.warningText,
									seedphraseBackedUp ? styles.warningTextGreen : styles.warningTextRed,
									styles.marginLeft
								]}
							>
								{strings(
									seedphraseBackedUp
										? 'app_settings.seedphrase_backed_up'
										: 'app_settings.seedphrase_not_backed_up'
								)}
							</Text>
							{currentSeedphraseHints && seedphraseBackedUp ? (
								<Text style={[styles.warningText, styles.warningBold]}>
									{strings('app_settings.view_hint')}
								</Text>
							) : null}
						</SettingsNotification>
						{!seedphraseBackedUp ? (
							<StyledButton type="blue" onPress={this.manualBackup} containerStyle={styles.Confirm}>
								{strings('app_settings.back_up_now')}
							</StyledButton>
						) : (
							<View style={styles.Protect}>
								<StyledButton
									type="normal"
									onPress={this.manualBackup}
									containerStyle={[styles.Confirm, styles.fifty]}
								>
									{strings('app_settings.back_up_again')}
								</StyledButton>
								<StyledButton
									type="blue"
									onPress={this.goToRevealPrivateCredential}
									containerStyle={[styles.Confirm, styles.fifty]}
								>
									{strings('reveal_credential.seed_phrase_title')}
								</StyledButton>
							</View>
						)}
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.privacy_mode')}</Text>
						<Text style={styles.desc}>{strings('app_settings.privacy_mode_desc')}</Text>
						<View style={styles.switchElement}>
							<Switch
								value={privacyMode}
								onValueChange={this.togglePrivacy}
								trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : null}
								ios_backgroundColor={colors.grey000}
							/>
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.metametrics_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.metametrics_description')}</Text>
						<View style={styles.switchElement}>
							<Switch
								value={metricsOptIn}
								onValueChange={this.toggleMetricsOptIn}
								trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : null}
								ios_backgroundColor={colors.grey000}
								testID={'metametrics-switch'}
							/>
						</View>
					</View>
					<View style={styles.setting} testID={'third-party-section'}>
						<Text style={styles.title}>{strings('app_settings.third_party_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.third_party_description')}</Text>
						<View style={styles.switchElement}>
							<Switch
								value={thirdPartyApiMode}
								onValueChange={this.toggleThirdPartyAPI}
								trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : null}
								ios_backgroundColor={colors.grey000}
							/>
						</View>
					</View>
					<View style={styles.setting} testID={'clear-privacy-section'}>
						<Text style={styles.title}>{strings('app_settings.clear_privacy_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.clear_privacy_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.toggleClearApprovalsModal}
							disabled={Object.keys(approvedHosts).length === 0}
							containerStyle={styles.Confirm}
						>
							{strings('app_settings.clear_privacy_title')}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.clear_browser_history_desc')}</Text>
						<Text style={styles.desc}>{strings('app_settings.clear_history_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.toggleClearBrowserHistoryModal}
							disabled={browserHistory.length === 0}
							containerStyle={styles.Confirm}
						>
							{strings('app_settings.clear_browser_history_desc')}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.clear_browser_cookies_desc')}</Text>
						<Text style={styles.desc}>{strings('app_settings.clear_cookies_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.toggleClearCookiesModal}
							containerStyle={styles.Confirm}
						>
							{strings('app_settings.clear_browser_cookies_desc')}
						</StyledButton>
					</View>
					<View style={styles.setting} testID={'auto-lock-section'}>
						<Text style={styles.title}>{strings('app_settings.auto_lock')}</Text>
						<Text style={styles.desc}>{strings('app_settings.auto_lock_desc')}</Text>
						<View style={styles.picker}>
							{this.autolockOptions && (
								<SelectComponent
									selectedValue={this.props.lockTime.toString()}
									onValueChange={this.selectLockTime}
									label={strings('app_settings.auto_lock')}
									options={this.autolockOptions}
								/>
							)}
						</View>
					</View>
					{biometryType && (
						<View style={styles.setting} testID={'biometrics-option'}>
							<Text style={styles.title}>
								{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
							</Text>
							<View style={styles.switchElement}>
								<Switch
									// eslint-disable-next-line react/jsx-no-bind
									onValueChange={(
										biometryChoice // eslint-disable-line react/jsx-no-bind
									) => this.onSecuritySettingChange(biometryChoice, 'biometrics')}
									value={this.state.biometryChoice}
									trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : null}
									ios_backgroundColor={colors.grey000}
								/>
							</View>
						</View>
					)}
					{biometryType && !this.state.biometryChoice && (
						<View style={styles.setting}>
							<Text style={styles.title}>
								{Device.isIos()
									? strings(`biometrics.enable_device_passcode_ios`)
									: strings(`biometrics.enable_device_passcode_android`)}
							</Text>
							<View style={styles.switchElement}>
								<Switch
									// eslint-disable-next-line react/jsx-no-bind
									onValueChange={(
										passcodeChoice // eslint-disable-line react/jsx-no-bind
									) => this.onSecuritySettingChange(passcodeChoice, 'passcode')}
									value={this.state.passcodeChoice}
									trackColor={Device.isIos() ? { true: colors.blue, false: colors.grey000 } : null}
									ios_backgroundColor={colors.grey000}
								/>
							</View>
						</View>
					)}
					<View style={styles.setting} testID={'reveal-private-key-section'}>
						<Text style={styles.title}>
							{strings('reveal_credential.private_key_title_for_account', { accountName: account.name })}
						</Text>
						<Text style={[styles.desc, styles.red]}>
							{strings('reveal_credential.private_key_warning', { accountName: account.name })}
						</Text>
						<StyledButton type="danger" onPress={this.goToExportPrivateKey} containerStyle={styles.Confirm}>
							{strings('reveal_credential.show_private_key')}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title} testID={'reveal-seed-title'}>
							{strings('reveal_credential.seed_phrase_title')}
						</Text>
						<Text style={[styles.desc, styles.red]}>{strings('reveal_credential.seed_warning')}</Text>
						<StyledButton
							type="danger"
							testID={'reveal-seedphrase-button'}
							onPress={this.goToRevealPrivateCredential}
							containerStyle={styles.Confirm}
						>
							{strings('reveal_credential.seed_phrase_title')}
						</StyledButton>
					</View>
					<ActionModal
						modalVisible={approvalModalVisible}
						confirmText={strings('app_settings.clear')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.toggleClearApprovalsModal}
						onRequestClose={this.toggleClearApprovalsModal}
						onConfirmPress={this.clearApprovals}
					>
						<View style={styles.modalView}>
							<Text style={styles.modalTitle}>{strings('app_settings.clear_approvals_modal_title')}</Text>
							<Text style={styles.modalText}>
								{strings('app_settings.clear_approvals_modal_message')}
							</Text>
						</View>
					</ActionModal>
					<ActionModal
						modalVisible={browserHistoryModalVisible}
						confirmText={strings('app_settings.clear')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.toggleClearBrowserHistoryModal}
						onRequestClose={this.toggleClearBrowserHistoryModal}
						onConfirmPress={this.clearBrowserHistory}
					>
						<View style={styles.modalView}>
							<Text style={styles.modalTitle}>
								{strings('app_settings.clear_browser_history_modal_title')}
							</Text>
							<Text style={styles.modalText}>
								{strings('app_settings.clear_browser_history_modal_message')}
							</Text>
						</View>
					</ActionModal>
					<ActionModal
						modalVisible={cookiesModalVisible}
						confirmText={strings('app_settings.clear')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.toggleClearCookiesModal}
						onRequestClose={this.toggleClearCookiesModal}
						onConfirmPress={this.clearCookies}
					>
						<View style={styles.modalView}>
							<Text style={styles.modalTitle}>{strings('app_settings.clear_cookies_modal_title')}</Text>
							<Text style={styles.modalText}>{strings('app_settings.clear_cookies_modal_message')}</Text>
						</View>
					</ActionModal>
				</View>
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({
	approvedHosts: state.privacy.approvedHosts,
	browserHistory: state.browser.history,
	lockTime: state.settings.lockTime,
	privacyMode: state.privacy.privacyMode,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	passwordHasBeenSet: state.user.passwordSet,
	seedphraseBackedUp: state.user.seedphraseBackedUp
});

const mapDispatchToProps = dispatch => ({
	clearBrowserHistory: () => dispatch(clearHistory()),
	clearHosts: () => dispatch(clearHosts()),
	setLockTime: lockTime => dispatch(setLockTime(lockTime)),
	setPrivacyMode: enabled => dispatch(setPrivacyMode(enabled)),
	setThirdPartyApiMode: enabled => dispatch(setThirdPartyApiMode(enabled)),
	passwordSet: () => dispatch(passwordSet())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);
