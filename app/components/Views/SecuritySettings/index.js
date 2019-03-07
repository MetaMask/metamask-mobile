import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, Switch, AsyncStorage, Text, ScrollView, Platform, View } from 'react-native';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import ActionModal from '../../UI/ActionModal';
import SecureKeychain from '../../../core/SecureKeychain';
import SelectComponent from '../../UI/SelectComponent';
import StyledButton from '../../UI/StyledButton';
import { clearHistory } from '../../../actions/browser';
import { clearHosts, setPrivacyMode } from '../../../actions/privacy';
import { colors, fontStyles } from '../../../styles/common';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { setLockTime } from '../../../actions/settings';
import { strings } from '../../../../locales/i18n';

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
		color: colors.copy,
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
		textAlign: 'center'
	},
	clearApprovedConfirm: {
		marginTop: 18
	},
	clearHistoryConfirm: {
		marginTop: 18
	},
	red: {
		color: colors.red
	},
	inner: {
		paddingBottom: 112
	},
	picker: {
		borderColor: colors.lightGray,
		borderRadius: 5,
		borderWidth: 2,
		marginTop: 16
	}
});

/**
 * Main view for app configurations
 */
class Settings extends Component {
	static propTypes = {
		/**
		 * Indicates whether privacy mode is enabled
		 */
		privacyMode: PropTypes.bool,
		/**
		 * Called to toggle privacy mode
		 */
		setPrivacyMode: PropTypes.func,
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
		identities: PropTypes.object
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.security_title'), navigation);

	state = {
		approvalModalVisible: false,
		biometryChoice: null,
		biometryType: null,
		browserHistoryModalVisible: false
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
			label: strings('app_settings.autolock_after', { time: 300 }),
			key: '300000'
		},
		{
			value: '600000',
			label: strings('app_settings.autolock_after', { time: 600 }),
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
		if (biometryType) {
			const biometryChoice = await AsyncStorage.getItem('@MetaMask:biometryChoice');
			let bioEnabled = false;
			if (biometryChoice !== '' && biometryChoice === biometryType) {
				bioEnabled = true;
			}
			this.setState({ biometryType, biometryChoice: bioEnabled });
		}
	};

	onBiometryChange = async enabled => {
		this.setState({ biometryChoice: enabled });
		const credentials = await SecureKeychain.getGenericPassword();
		if (credentials) {
			await SecureKeychain.resetGenericPassword();
			const authOptions = {
				accessControl: enabled
					? SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					: SecureKeychain.ACCESS_CONTROL.DEVICE_PASSCODE
			};
			await SecureKeychain.setGenericPassword('metamask-user', credentials.password, authOptions);

			if (!enabled) {
				await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			} else {
				await AsyncStorage.setItem('@MetaMask:biometryChoice', this.state.biometryType);
			}
		}
	};

	displayClearApprovalsModal = () => {
		this.setState({ approvalModalVisible: true });
	};

	displayClearBrowserHistoryModal = () => {
		this.setState({ browserHistoryModalVisible: true });
	};

	clearApprovals = () => {
		this.props.clearHosts();
		this.cancelClearApprovals();
	};

	clearBrowserHistory = () => {
		this.props.clearBrowserHistory();
		this.cancelClearBrowserHistory();
	};

	cancelClearApprovals = () => {
		this.setState({ approvalModalVisible: false });
	};

	cancelClearBrowserHistory = () => {
		this.setState({ browserHistoryModalVisible: false });
	};

	togglePrivacy = value => {
		this.props.setPrivacyMode(value);
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

	render = () => {
		const { approvedHosts, browserHistory, privacyMode } = this.props;
		const { approvalModalVisible, biometryType, browserHistoryModalVisible } = this.state;
		const { accounts, identities, selectedAddress } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };

		return (
			<ScrollView style={styles.wrapper}>
				<View style={styles.inner}>
					<View style={[styles.setting, styles.firstSetting]}>
						<Text style={styles.title}>{strings('app_settings.privacy_mode')}</Text>
						<Text style={styles.desc}>{strings('app_settings.privacy_mode_desc')}</Text>
						<View style={styles.switchElement}>
							<Switch
								value={privacyMode}
								onValueChange={this.togglePrivacy}
								trackColor={
									Platform.OS === 'ios' ? { true: colors.primary, false: colors.concrete } : null
								}
								ios_backgroundColor={colors.slate}
							/>
						</View>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.clear_privacy_title')}</Text>
						<Text style={styles.desc}>{strings('app_settings.clear_privacy_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.displayClearApprovalsModal}
							disabled={Object.keys(approvedHosts).length === 0}
							containerStyle={styles.clearApprovedConfirm}
						>
							{strings('app_settings.clear_privacy_title').toUpperCase()}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('app_settings.clear_browser_history_desc')}</Text>
						<Text style={styles.desc}>{strings('app_settings.clear_history_desc')}</Text>
						<StyledButton
							type="normal"
							onPress={this.displayClearBrowserHistoryModal}
							disabled={browserHistory.length === 0}
							containerStyle={styles.clearHistoryConfirm}
						>
							{strings('app_settings.clear_browser_history_desc').toUpperCase()}
						</StyledButton>
					</View>
					<View style={styles.setting}>
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
						<View style={styles.setting}>
							<Text style={styles.title}>
								{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
							</Text>
							<View style={styles.switchElement}>
								<Switch
									onValueChange={biometryChoice => this.onBiometryChange(biometryChoice)} // eslint-disable-line react/jsx-no-bind
									value={this.state.biometryChoice}
									trackColor={
										Platform.OS === 'ios' ? { true: colors.primary, false: colors.concrete } : null
									}
									ios_backgroundColor={colors.slate}
								/>
							</View>
						</View>
					)}
					<View style={styles.setting}>
						<Text style={styles.title}>
							{strings('reveal_credential.private_key_title_for_account', { accountName: account.name })}
						</Text>
						<Text style={[styles.desc, styles.red]}>
							{strings('reveal_credential.private_key_warning', { accountName: account.name })}
						</Text>
						<StyledButton
							type="danger"
							onPress={this.goToExportPrivateKey}
							containerStyle={styles.clearHistoryConfirm}
						>
							{strings('reveal_credential.show_private_key').toUpperCase()}
						</StyledButton>
					</View>
					<View style={styles.setting}>
						<Text style={styles.title}>{strings('reveal_credential.seed_phrase_title')}</Text>
						<Text style={[styles.desc, styles.red]}>{strings('reveal_credential.seed_warning')}</Text>
						<StyledButton
							type="danger"
							onPress={this.goToRevealPrivateCredential}
							containerStyle={styles.clearHistoryConfirm}
						>
							{strings('reveal_credential.seed_phrase_title').toUpperCase()}
						</StyledButton>
					</View>
					<ActionModal
						modalVisible={approvalModalVisible}
						confirmText={strings('app_settings.clear')}
						cancelText={strings('app_settings.reset_account_cancel_button')}
						onCancelPress={this.cancelClearApprovals}
						onRequestClose={this.cancelClearApprovals}
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
						onCancelPress={this.cancelClearBrowserHistory}
						onRequestClose={this.cancelClearBrowserHistory}
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
	selectedAddress: toChecksumAddress(state.engine.backgroundState.PreferencesController.selectedAddress),
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	identities: state.engine.backgroundState.PreferencesController.identities
});

const mapDispatchToProps = dispatch => ({
	clearBrowserHistory: () => dispatch(clearHistory()),
	clearHosts: () => dispatch(clearHosts()),
	setLockTime: lockTime => dispatch(setLockTime(lockTime)),
	setPrivacyMode: enabled => dispatch(setPrivacyMode(enabled))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Settings);
