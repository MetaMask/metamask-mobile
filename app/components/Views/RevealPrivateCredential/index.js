/* eslint-disable no-mixed-spaces-and-tabs */
import React, { PureComponent } from 'react';
import {
	Dimensions,
	SafeAreaView,
	StyleSheet,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	InteractionManager,
	Linking,
	Platform,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import PropTypes from 'prop-types';
import QRCode from 'react-native-qrcode-svg';
import ScrollableTabView, { DefaultTabBar } from 'react-native-scrollable-tab-view';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { connect } from 'react-redux';

import ActionView from '../../UI/ActionView';
import ButtonReveal from '../../UI/ButtonReveal';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import InfoModal from '../../UI/Swaps/components/InfoModal';
import { showAlert } from '../../../actions/alert';
import { BIOMETRY_CHOICE } from '../../../constants/storage';
import ClipboardManager from '../../../core/ClipboardManager';
import Engine from '../../../core/Engine';
import PreventScreenshot from '../../../core/PreventScreenshot';
import SecureKeychain from '../../../core/SecureKeychain';
import { colors, fontStyles } from '../../../styles/common';
import AnalyticsV2 from '../../../util/analyticsV2';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	normalText: {
		...fontStyles.normal,
	},
	seedPhrase: {
		backgroundColor: colors.white,
		marginTop: 10,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		fontSize: 20,
		textAlign: 'center',
		color: colors.black,
		...fontStyles.normal,
	},
	seedPhraseView: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.grey400,
		marginTop: 10,
		alignItems: 'center',
	},
	privateCredentialAction: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderColor: colors.blue,
		borderWidth: 1,
		borderRadius: 20,
		width: '90%',
		paddingVertical: 10,
		marginBottom: 15,
	},
	rowWrapper: {
		padding: 20,
	},
	warningWrapper: {
		backgroundColor: colors.red000,
		margin: 20,
		marginTop: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.red100,
	},
	warningRowWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		padding: 8,
	},
	warningText: {
		marginTop: 10,
		color: colors.red,
		...fontStyles.normal,
	},
	input: {
		borderWidth: 2,
		borderRadius: 5,
		borderColor: colors.grey000,
		padding: 10,
	},
	icon: {
		color: colors.red,
	},
	blueText: {
		color: colors.blue,
	},
	link: {
		top: 2.5,
	},
	warningMessageText: {
		marginLeft: 10,
		marginRight: 40,
		...fontStyles.normal,
	},
	enterPassword: {
		marginBottom: 10,
		...fontStyles.bold,
	},
	boldText: {
		...fontStyles.bold,
	},
	tabContent: {
		padding: 20,
	},
	qrCodeWrapper: {
		marginTop: 20,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue,
	},
	tabStyle: {
		paddingBottom: 0,
		backgroundColor: colors.beige,
	},
	textStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold,
	},
	revealModalText: {
		marginBottom: 20,
	},
});

const WRONG_PASSWORD_ERROR = 'error: Invalid password';
const PRIVATE_KEY = 'private_key';
// const SEED_PHRASE = 'seed_phrase';
const SRP_URL =
	'https://metamask.zendesk.com/hc/en-us/articles/4404722782107-User-guide-Secret-Recovery-Phrase-password-and-private-keys';
const NON_CUSTODIAL_WALLET_URL =
	'https://metamask.zendesk.com/hc/en-us/articles/360059952212-MetaMask-is-a-non-custodial-wallet';
const KEEP_SRP_SAFE_URL =
	'https://metamask.zendesk.com/hc/en-us/articles/4407169552667-Scammers-and-Phishers-Rugpulls-and-airdrop-scams';

/**
 * View that displays private account information as private key or seed phrase
 */
class RevealPrivateCredential extends PureComponent {
	state = {
		clipboardPrivateCredential: '',
		unlocked: false,
		isUserUnlocked: false,
		password: '',
		warningIncorrectPassword: '',
		isModalVisible: false,
	};

	static navigationOptions = ({ navigation, route }) =>
		getNavigationOptionsTitle(
			strings(`reveal_credential.${route.params?.privateCredentialName ?? ''}_title`),
			navigation
		);

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired,
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Boolean that determines if the user has set a password before
		 */
		passwordSet: PropTypes.bool,
		/**
		 * String that determines whether to show the seedphrase or private key export screen
		 */
		privateCredentialName: PropTypes.string,
		/**
		 * Cancel function to be called when cancel button is clicked. If not provided, we go to previous screen on cancel
		 */
		cancel: PropTypes.func,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	async componentDidMount() {
		// Try to use biometrics to unloc
		// (if available)
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (!this.props.passwordSet) {
			this.tryUnlockWithPassword('');
		} else if (biometryType) {
			const biometryChoice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
			if (biometryChoice !== '' && biometryChoice === biometryType) {
				const credentials = await SecureKeychain.getGenericPassword();
				if (credentials) {
					this.tryUnlockWithPassword(credentials.password);
				}
			}
		}
		InteractionManager.runAfterInteractions(() => {
			PreventScreenshot.forbid();
		});
	}

	componentWillUnmount = () => {
		InteractionManager.runAfterInteractions(() => {
			PreventScreenshot.allow();
		});
	};

	cancel = () => {
		if (!this.unlocked) AnalyticsV2.trackEvent(AnalyticsV2.REVEAL_SRP_CANCELLED, { view: 'Enter password' });

		if (this.props.cancel) return this.props.cancel();
		const { navigation } = this.props;
		navigation.pop();
	};

	async tryUnlockWithPassword(password, privateCredentialName) {
		const { KeyringController } = Engine.context;
		const { selectedAddress } = this.props;
		const isPrivateKeyReveal = privateCredentialName === PRIVATE_KEY;

		try {
			let privateCredential;
			if (!isPrivateKeyReveal) {
				const mnemonic = await KeyringController.exportSeedPhrase(password);
				privateCredential = JSON.stringify(mnemonic).replace(/"/g, '');
			} else {
				privateCredential = await KeyringController.exportAccount(password, selectedAddress);
			}

			if (privateCredential && (this.state.isUserUnlocked || isPrivateKeyReveal)) {
				AnalyticsV2.trackEvent(AnalyticsV2.REVEAL_SRP_COMPLETED, { action: 'viewed' });

				this.setState({
					clipboardPrivateCredential: privateCredential,
					unlocked: true,
				});
			}
		} catch (e) {
			let msg = strings('reveal_credential.warning_incorrect_password');
			if (e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()) {
				msg = strings('reveal_credential.unknown_error');
			}

			this.setState({
				isModalVisible: false,
				unlocked: false,
				warningIncorrectPassword: msg,
			});
		}
	}

	tryUnlock = (privateCredentialName) => {
		if (privateCredentialName === PRIVATE_KEY) {
			const { password } = this.state;
			this.tryUnlockWithPassword(password, privateCredentialName);
		} else {
			this.setState({ isModalVisible: true });
		}
	};

	onPasswordChange = (password) => {
		this.setState({ password });
	};

	copyPrivateCredentialToClipboard = async (privateCredentialName) => {
		AnalyticsV2.trackEvent(AnalyticsV2.REVEAL_SRP_COMPLETED, { action: 'copied to clipboard' });

		const { clipboardPrivateCredential } = this.state;
		await ClipboardManager.setStringExpire(clipboardPrivateCredential);

		const msg =
			privateCredentialName === PRIVATE_KEY
				? `${strings(`reveal_credential.${privateCredentialName}_copied`)}\n${strings(
						`reveal_credential.${privateCredentialName}_copied_time`
				  )}`
				: // for SRP on Android it doesn't show clipboard time limit
				  `${strings(`reveal_credential.${privateCredentialName}_copied_${Platform.OS}`)}${
						Device.isIos() ? strings(`reveal_credential.${privateCredentialName}_copied_time`) : ''
				  }`;

		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: {
				msg,
				width: '70%',
			},
		});
	};

	revearlSRP = () => {
		const { password } = this.state;
		this.tryUnlockWithPassword(password);

		this.setState({
			isUserUnlocked: true,
			isModalVisible: false,
		});
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	renderTabView(privateCredentialName) {
		const { clipboardPrivateCredential } = this.state;

		return (
			<ScrollableTabView renderTabBar={this.renderTabBar}>
				<View tabLabel={strings(`reveal_credential.text`)} style={styles.tabContent}>
					<Text style={styles.boldText}>{strings(`reveal_credential.${privateCredentialName}`)}</Text>
					<View style={styles.seedPhraseView}>
						<TextInput
							value={clipboardPrivateCredential}
							numberOfLines={3}
							multiline
							selectTextOnFocus
							style={styles.seedPhrase}
							editable={false}
							testID={'private-credential-text'}
						/>
						<TouchableOpacity
							style={styles.privateCredentialAction}
							onPress={() => this.copyPrivateCredentialToClipboard(privateCredentialName)}
							testID={'private-credential-touchable'}
						>
							<Text style={styles.blueText}>{strings('reveal_credential.copy_to_clipboard')}</Text>
						</TouchableOpacity>
					</View>
				</View>
				<View tabLabel={strings(`reveal_credential.qr_code`)} style={styles.tabContent}>
					<View style={styles.qrCodeWrapper}>
						<QRCode value={clipboardPrivateCredential} size={Dimensions.get('window').width - 160} />
					</View>
				</View>
			</ScrollableTabView>
		);
	}

	renderPasswordEntry() {
		return (
			<>
				<Text style={styles.enterPassword}>{strings('reveal_credential.enter_password')}</Text>
				<TextInput
					style={styles.input}
					testID={'private-credential-password-text-input'}
					placeholder={'Password'}
					placeholderTextColor={colors.grey100}
					onChangeText={this.onPasswordChange}
					secureTextEntry
					onSubmitEditing={this.tryUnlock}
				/>
				<Text style={styles.warningText} testID={'password-warning'}>
					{this.state.warningIncorrectPassword}
				</Text>
			</>
		);
	}

	closeModal = () => {
		AnalyticsV2.trackEvent(AnalyticsV2.REVEAL_SRP_CANCELLED, { view: 'Hold to reveal' });

		this.setState({
			isModalVisible: false,
		});
	};

	renderModal() {
		return (
			<InfoModal
				isVisible={this.state.isModalVisible}
				toggleModal={this.closeModal}
				body={
					<>
						<Text style={[styles.normalText, styles.revealModalText]}>
							{strings('reveal_credential.seed_phrase_modal')[0]}
							<Text style={styles.boldText}>{strings('reveal_credential.seed_phrase_modal')[1]}</Text>
							{strings('reveal_credential.seed_phrase_modal')[2]}
							<TouchableOpacity onPress={() => Linking.openURL(KEEP_SRP_SAFE_URL)}>
								<Text style={[styles.blueText, styles.link]}>
									{strings('reveal_credential.seed_phrase_modal')[3]}
								</Text>
							</TouchableOpacity>
						</Text>

						<ButtonReveal
							label={strings('reveal_credential.hold_to_reveal_srp')}
							onLongPress={this.revearlSRP}
						/>
					</>
				}
				title={strings('reveal_credential.keep_srp_safe')}
			/>
		);
	}

	renderSRPExplaination() {
		return (
			<Text style={styles.normalText}>
				{strings('reveal_credential.seed_phrase_explanation')[0]}
				<TouchableOpacity onPress={() => Linking.openURL(SRP_URL)}>
					<Text style={[styles.blueText, styles.link]}>
						{strings('reveal_credential.seed_phrase_explanation')[1]}
					</Text>
				</TouchableOpacity>
				{strings('reveal_credential.seed_phrase_explanation')[2]}
				<Text style={styles.boldText}>{strings('reveal_credential.seed_phrase_explanation')[3]}</Text>
				{strings('reveal_credential.seed_phrase_explanation')[4]}
				<TouchableOpacity onPress={() => Linking.openURL(NON_CUSTODIAL_WALLET_URL)}>
					<Text style={[styles.blueText, styles.link]}>
						{strings('reveal_credential.seed_phrase_explanation')[5]}
					</Text>
				</TouchableOpacity>
				{strings('reveal_credential.seed_phrase_explanation')[6]}
				<Text style={styles.boldText}>{strings('reveal_credential.seed_phrase_explanation')[7]}</Text>
			</Text>
		);
	}

	renderWarning(privateCredentialName) {
		return (
			<View style={styles.warningWrapper}>
				<View style={[styles.rowWrapper, styles.warningRowWrapper]}>
					<Icon style={styles.icon} name="eye-slash" size={20} solid />
					{privateCredentialName === PRIVATE_KEY ? (
						<Text style={styles.warningMessageText}>
							{strings(`reveal_credential.${privateCredentialName}_warning_explanation`)}
						</Text>
					) : (
						<Text style={styles.warningMessageText}>
							{strings('reveal_credential.seed_phrase_warning_explanation')[0]}
							<Text style={styles.boldText}>
								{strings('reveal_credential.seed_phrase_warning_explanation')[1]}
							</Text>
						</Text>
					)}
				</View>
			</View>
		);
	}

	render = () => {
		const { unlocked, isUserUnlocked, password } = this.state;
		const privateCredentialName = this.props.privateCredentialName || this.props.route.params.privateCredentialName;
		const isPrivateKeyReveal = privateCredentialName === PRIVATE_KEY;

		return (
			<SafeAreaView style={styles.wrapper} testID={'reveal-private-credential-screen'}>
				<ActionView
					cancelText={unlocked ? strings('reveal_credential.done') : strings('reveal_credential.cancel')}
					confirmText={strings('reveal_credential.confirm')}
					onCancelPress={this.cancel}
					testID={`next-button`}
					onConfirmPress={() => this.tryUnlock(privateCredentialName)}
					showConfirmButton={!unlocked}
					confirmDisabled={!password.length}
				>
					<>
						<View style={[styles.rowWrapper, styles.normalText]}>
							{isPrivateKeyReveal ? (
								<Text style={styles.normalText}>
									{strings(`reveal_credential.private_key_explanation`)}
								</Text>
							) : (
								this.renderSRPExplaination()
							)}
						</View>
						{this.renderWarning(privateCredentialName)}

						<View style={styles.rowWrapper}>
							{unlocked && (isUserUnlocked || isPrivateKeyReveal)
								? this.renderTabView(privateCredentialName)
								: this.renderPasswordEntry()}
						</View>
					</>
				</ActionView>
				{!isPrivateKeyReveal && this.renderModal()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	passwordSet: state.user.passwordSet,
});

const mapDispatchToProps = (dispatch) => ({
	showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RevealPrivateCredential);
