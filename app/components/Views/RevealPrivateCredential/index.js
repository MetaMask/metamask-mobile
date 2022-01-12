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
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import ActionView from '../../UI/ActionView';
import Icon from 'react-native-vector-icons/FontAwesome';
import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import SecureKeychain from '../../../core/SecureKeychain';
import { showAlert } from '../../../actions/alert';
import QRCode from 'react-native-qrcode-svg';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { BIOMETRY_CHOICE } from '../../../constants/storage';
import ClipboardManager from '../../../core/ClipboardManager';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	header: {
		borderBottomColor: colors.grey400,
		borderBottomWidth: 1,
		...fontStyles.normal,
	},
	seedPhrase: {
		backgroundColor: colors.white,
		marginTop: 10,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		borderColor: colors.grey400,
		borderBottomWidth: 1,
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
		flexDirection: 'row',
		alignItems: 'center',
	},
	rowWrapper: {
		padding: 20,
	},
	warningWrapper: {
		backgroundColor: colors.red000,
	},
	warningRowWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignContent: 'center',
		alignItems: 'center',
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
		margin: 10,
		color: colors.red,
	},
	actionIcon: {
		margin: 10,
		color: colors.blue,
	},
	actionText: {
		color: colors.blue,
	},
	warningMessageText: {
		marginLeft: 10,
		marginRight: 40,
		...fontStyles.normal,
	},
	enterPassword: {
		marginBottom: 15,
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
});

const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';

/**
 * View that displays private account information as private key or seed phrase
 */
class RevealPrivateCredential extends PureComponent {
	state = {
		privateCredential: '',
		unlocked: false,
		password: '',
		warningIncorrectPassword: '',
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
		if (this.props.cancel) return this.props.cancel();
		const { navigation } = this.props;
		navigation.pop();
	};

	async tryUnlockWithPassword(password) {
		const { KeyringController } = Engine.context;
		const { selectedAddress } = this.props;

		const privateCredentialName = this.props.privateCredentialName || this.props.route.params.privateCredentialName;

		try {
			if (privateCredentialName === 'seed_phrase') {
				const mnemonic = await KeyringController.exportSeedPhrase(password);
				const privateCredential = JSON.stringify(mnemonic).replace(/"/g, '');
				this.setState({ privateCredential, unlocked: true });
			} else if (privateCredentialName === 'private_key') {
				const privateCredential = await KeyringController.exportAccount(password, selectedAddress);
				this.setState({ privateCredential, unlocked: true });
			}
		} catch (e) {
			let msg = strings('reveal_credential.warning_incorrect_password');
			if (e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()) {
				msg = strings('reveal_credential.unknown_error');
			}

			this.setState({
				unlock: false,
				warningIncorrectPassword: msg,
			});
		}
	}

	tryUnlock = () => {
		const { password } = this.state;
		this.tryUnlockWithPassword(password);
	};

	onPasswordChange = (password) => {
		this.setState({ password });
	};

	copyPrivateCredentialToClipboard = async () => {
		const { privateCredential } = this.state;
		const privateCredentialName = this.props.privateCredentialName || this.props.route.params.privateCredentialName;
		await ClipboardManager.setStringExpire(privateCredential);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: {
				msg: `${strings(`reveal_credential.${privateCredentialName}_copied`)}\n${strings(
					`reveal_credential.${privateCredentialName}_copied_time`
				)}`,
				width: '70%',
			},
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

	render = () => {
		const { unlocked, privateCredential } = this.state;
		const privateCredentialName = this.props.privateCredentialName || this.props.route.params.privateCredentialName;

		return (
			<SafeAreaView style={styles.wrapper} testID={'reveal-private-credential-screen'}>
				<ActionView
					cancelText={strings('reveal_credential.cancel')}
					confirmText={strings('reveal_credential.confirm')}
					onCancelPress={this.cancel}
					testID={`next-button`}
					onConfirmPress={this.tryUnlock}
					showConfirmButton={!unlocked}
				>
					<View>
						<View style={[styles.rowWrapper, styles.header]}>
							<Text>{strings(`reveal_credential.${privateCredentialName}_explanation`)}</Text>
						</View>
						<View style={styles.warningWrapper}>
							<View style={[styles.rowWrapper, styles.warningRowWrapper]}>
								<Icon style={styles.icon} name="warning" size={22} />
								<Text style={styles.warningMessageText}>
									{strings(`reveal_credential.${privateCredentialName}_warning_explanation`)}
								</Text>
							</View>
						</View>

						<View style={styles.rowWrapper}>
							{unlocked ? (
								<ScrollableTabView renderTabBar={this.renderTabBar}>
									<View tabLabel={strings(`reveal_credential.text`)} style={styles.tabContent}>
										<Text>{strings(`reveal_credential.${privateCredentialName}`)}</Text>
										<View style={styles.seedPhraseView}>
											<TextInput
												value={privateCredential}
												numberOfLines={3}
												multiline
												selectTextOnFocus
												style={styles.seedPhrase}
												editable={false}
												testID={'private-credential-text'}
											/>
											<TouchableOpacity
												style={styles.privateCredentialAction}
												onPress={this.copyPrivateCredentialToClipboard}
												testID={'private-credential-touchable'}
											>
												<Icon style={styles.actionIcon} name="copy" size={18} />
												<Text style={styles.actionText}>
													{strings('reveal_credential.copy_to_clipboard')}
												</Text>
											</TouchableOpacity>
										</View>
									</View>
									<View tabLabel={strings(`reveal_credential.qr_code`)} style={styles.tabContent}>
										<View style={styles.qrCodeWrapper}>
											<QRCode
												value={privateCredential}
												size={Dimensions.get('window').width - 160}
											/>
										</View>
									</View>
								</ScrollableTabView>
							) : (
								<View>
									<Text style={styles.enterPassword}>
										{strings('reveal_credential.enter_password')}
									</Text>
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
								</View>
							)}
						</View>
					</View>
				</ActionView>
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
