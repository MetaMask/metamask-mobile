import React, { PureComponent } from 'react';
import {
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	InteractionManager,
	TextInput,
	KeyboardAvoidingView,
	TouchableOpacity
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import FeatherIcons from 'react-native-vector-icons/Feather';
import { BlurView } from '@react-native-community/blur';
import ActionView from '../../UI/ActionView';
import Device from '../../../util/Device';
import Engine from '../../../core/Engine';
import PreventScreenshot from '../../../core/PreventScreenshot';
import SecureKeychain from '../../../core/SecureKeychain';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
	MANUAL_BACKUP_STEPS,
	SEED_PHRASE,
	CONFIRM_PASSWORD,
	WRONG_PASSWORD_ERROR
} from '../../../constants/onboarding';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 32
	},
	onBoardingWrapper: {
		paddingHorizontal: 20
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 300,
		justifyContent: 'center',
		alignItems: 'center'
	},
	action: {
		fontSize: 18,
		marginVertical: 16,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	infoWrapper: {
		marginBottom: 16,
		justifyContent: 'center'
	},
	info: {
		fontSize: 14,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal,
		paddingHorizontal: 6
	},
	seedPhraseConcealer: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		backgroundColor: colors.grey700,
		opacity: 0.7,
		alignItems: 'center',
		borderRadius: 8,
		paddingHorizontal: 24,
		paddingVertical: 45
	},
	touchableOpacity: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		borderRadius: 8
	},
	blurView: {
		position: 'absolute',
		top: 0,
		left: 0,
		bottom: 0,
		right: 0,
		borderRadius: 8
	},
	icon: {
		width: 24,
		height: 24,
		color: colors.white,
		textAlign: 'center',
		marginBottom: 32
	},
	reveal: {
		fontSize: Device.isMediumDevice() ? 13 : 16,
		...fontStyles.extraBold,
		color: colors.white,
		lineHeight: 22,
		marginBottom: 8,
		textAlign: 'center'
	},
	watching: {
		fontSize: Device.isMediumDevice() ? 10 : 12,
		color: colors.white,
		lineHeight: 17,
		marginBottom: 32,
		textAlign: 'center'
	},
	viewButtonContainer: {
		width: 155,
		padding: 12
	},
	seedPhraseWrapper: {
		backgroundColor: colors.white,
		borderRadius: 8,
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1,
		marginBottom: 64,
		height: 275
	},
	wordColumn: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: Device.isMediumDevice() ? 18 : 24,
		paddingVertical: 18,
		justifyContent: 'space-between'
	},
	wordWrapper: {
		flexDirection: 'row'
	},
	word: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 14,
		color: colors.fontPrimary,
		backgroundColor: colors.white,
		borderColor: colors.blue,
		borderWidth: 1,
		borderRadius: 13,
		textAlign: 'center',
		textAlignVertical: 'center',
		lineHeight: 14,
		flex: 1
	},
	confirmPasswordWrapper: {
		flex: 1,
		padding: 30,
		paddingTop: 0
	},
	passwordRequiredContent: {
		marginBottom: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
		marginTop: 20,
		justifyContent: 'center'
	},
	label: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	buttonWrapper: {
		flex: 1,
		marginTop: 20,
		justifyContent: 'flex-end'
	},
	input: {
		borderWidth: 2,
		borderRadius: 5,
		width: '100%',
		borderColor: colors.grey000,
		padding: 10,
		height: 40
	},
	warningMessageText: {
		paddingVertical: 10,
		color: colors.red,
		...fontStyles.normal
	},
	keyboardAvoidingView: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	}
});

/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
export default class ManualBackupStep1 extends PureComponent {
	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	steps = MANUAL_BACKUP_STEPS;

	state = {
		seedPhraseHidden: true,
		currentStep: 1,
		password: undefined,
		warningIncorrectPassword: undefined,
		ready: false,
		view: SEED_PHRASE
	};

	async componentDidMount() {
		this.words = this.props.navigation.getParam('words', []);
		if (!this.words.length) {
			try {
				const credentials = await SecureKeychain.getGenericPassword();
				if (credentials) {
					this.words = await this.tryExportSeedPhrase(credentials.password);
				} else {
					this.setState({ view: CONFIRM_PASSWORD });
				}
			} catch (e) {
				this.setState({ view: CONFIRM_PASSWORD });
			}
		}
		this.setState({ ready: true });
		InteractionManager.runAfterInteractions(() => PreventScreenshot.forbid());
	}

	onPasswordChange = password => {
		this.setState({ password });
	};

	goNext = () => {
		this.props.navigation.navigate('ManualBackupStep2', { words: this.words, steps: this.steps });
	};

	revealSeedPhrase = () => this.setState({ seedPhraseHidden: false });

	tryExportSeedPhrase = async password => {
		const { KeyringController } = Engine.context;
		const mnemonic = await KeyringController.exportSeedPhrase(password);
		const seed = JSON.stringify(mnemonic)
			.replace(/"/g, '')
			.split(' ');
		return seed;
	};

	tryUnlockWithPassword = async password => {
		this.setState({ ready: false });
		try {
			this.words = await this.tryExportSeedPhrase(password);
			this.setState({ view: SEED_PHRASE, ready: true });
		} catch (e) {
			let msg = strings('reveal_credential.warning_incorrect_password');
			if (e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()) {
				msg = strings('reveal_credential.unknown_error');
			}
			this.setState({
				warningIncorrectPassword: msg,
				ready: true
			});
		}
	};

	tryUnlock = () => {
		const { password } = this.state;
		this.tryUnlockWithPassword(password);
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	renderSeedPhraseConcealer = () => (
		<React.Fragment>
			<TouchableOpacity onPress={this.revealSeedPhrase} style={styles.touchableOpacity}>
				<BlurView blurType="light" blurAmount={5} style={styles.blurView} />
				<View style={styles.seedPhraseConcealer}>
					<FeatherIcons name="eye-off" size={24} style={styles.icon} />
					<Text style={styles.reveal}>{strings('manual_backup_step_1.reveal')}</Text>
					<Text style={styles.watching}>{strings('manual_backup_step_1.watching')}</Text>
					<View style={styles.viewButtonWrapper}>
						<StyledButton
							type={'view'}
							testID={'view-button'}
							onPress={this.revealSeedPhrase}
							containerStyle={styles.viewButtonContainer}
						>
							{strings('manual_backup_step_1.view')}
						</StyledButton>
					</View>
				</View>
			</TouchableOpacity>
		</React.Fragment>
	);

	renderConfirmPassword() {
		const { warningIncorrectPassword } = this.state;
		return (
			<KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={'padding'}>
				<KeyboardAwareScrollView style={baseStyles.flexGrow} enableOnAndroid>
					<View style={styles.confirmPasswordWrapper}>
						<View style={[styles.content, styles.passwordRequiredContent]}>
							<Text style={styles.title}>{strings('manual_backup_step_1.confirm_password')}</Text>
							<View style={styles.text}>
								<Text style={styles.label}>{strings('manual_backup_step_1.before_continiuing')}</Text>
							</View>
							<TextInput
								style={styles.input}
								placeholder={'Password'}
								placeholderTextColor={colors.grey100}
								onChangeText={this.onPasswordChange}
								secureTextEntry
								onSubmitEditing={this.tryUnlock}
								testID={'private-credential-password-text-input'}
							/>
							{warningIncorrectPassword && (
								<Text style={styles.warningMessageText}>{warningIncorrectPassword}</Text>
							)}
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.tryUnlock}
								testID={'submit-button'}
							>
								{strings('manual_backup_step_1.confirm')}
							</StyledButton>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</KeyboardAvoidingView>
		);
	}

	renderSeedphraseView = () => (
		<ActionView
			confirmTestID={'manual-backup-step-1-continue-button'}
			confirmText={strings('manual_backup_step_1.continue')}
			onConfirmPress={this.goNext}
			confirmDisabled={this.state.seedPhraseHidden}
			showCancelButton={false}
			confirmButtonMode={'confirm'}
		>
			<View style={styles.wrapper} testID={'manual_backup_step_1-screen'}>
				<Text style={styles.action}>{strings('manual_backup_step_1.action')}</Text>
				<View style={styles.infoWrapper}>
					<Text style={styles.info}>{strings('manual_backup_step_1.info')}</Text>
				</View>
				<View style={styles.seedPhraseWrapper}>
					<View style={styles.wordColumn}>
						{this.words.slice(0, 6).map((word, i) => (
							<View key={`word_${i}`} style={styles.wordWrapper}>
								<Text style={styles.word}>{`${i + 1}. ${word}`}</Text>
							</View>
						))}
					</View>
					<View style={styles.wordColumn}>
						{this.words.slice(-6).map((word, i) => (
							<View key={`word_${i}`} style={styles.wordWrapper}>
								<Text style={styles.word}>{`${i + 7}. ${word}`}</Text>
							</View>
						))}
					</View>
					{this.state.seedPhraseHidden && this.renderSeedPhraseConcealer()}
				</View>
			</View>
		</ActionView>
	);

	render() {
		const { ready, currentStep, view } = this.state;
		if (!ready) return this.renderLoader();
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.onBoardingWrapper}>
					<OnboardingProgress currentStep={currentStep} steps={this.steps} />
				</View>
				{view === SEED_PHRASE ? this.renderSeedphraseView() : this.renderConfirmPassword()}
			</SafeAreaView>
		);
	}
}
