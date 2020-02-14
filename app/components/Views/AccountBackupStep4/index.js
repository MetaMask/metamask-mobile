import React, { PureComponent } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
	SafeAreaView,
	StyleSheet,
	TextInput
} from 'react-native';

import PropTypes from 'prop-types';
import Pager from '../../UI/Pager';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flexGrow: 1
	},
	wrapper: {
		flex: 1,
		padding: 30,
		paddingTop: 0
	},
	content: {
		alignItems: 'flex-start'
	},
	passwordRequiredContent: {
		marginBottom: 20
	},
	title: {
		fontSize: 32,
		marginTop: 10,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
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
		justifyContent: 'flex-end'
	},
	navbarLeftButton: {
		alignSelf: 'flex-start',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10
	},
	navbarLeftText: {
		fontSize: 18,
		color: colors.blue,
		...fontStyles.normal
	},
	seedPhraseWrapper: {
		backgroundColor: colors.grey000,
		borderRadius: 10,
		marginBottom: 22,
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1
	},
	colLeft: {
		paddingVertical: 20,
		paddingBottom: 10,
		flex: 1,
		alignItems: 'center',
		borderColor: colors.grey100,
		borderRightWidth: 1
	},
	colRight: {
		paddingVertical: 20,
		paddingBottom: 10,
		flex: 1,
		alignItems: 'center'
	},
	word: {
		paddingHorizontal: 8,
		paddingTop: 6,
		paddingBottom: 4,
		width: 105,
		fontSize: 14,
		color: colors.fontPrimary,
		lineHeight: 14,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderWidth: 1,
		marginBottom: 15,
		borderRadius: 4
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 300,
		justifyContent: 'center',
		alignItems: 'center'
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
	}
});

const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
const SEED_PHRASE = 'seed_phrase';
const CONFIRM_PASSWORD = 'confirm_password';
/**
 * View that's shown during the fourth step of
 * the backup seed phrase flow
 */
export default class AccountBackupStep4 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};
	state = {
		ready: false,
		view: SEED_PHRASE,
		password: undefined,
		warningIncorrectPassword: undefined
	};

	onPasswordChange = password => {
		this.setState({ password });
	};

	tryExportSeedPhrase = async password => {
		const { KeyringController } = Engine.context;
		const mnemonic = await KeyringController.exportSeedPhrase(password);
		const seed = JSON.stringify(mnemonic)
			.replace(/"/g, '')
			.split(' ');
		return seed;
	};

	async componentDidMount() {
		this.words = this.props.navigation.getParam('words', []);
		// If the user is going to the backup seed flow directly
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
	}

	dismiss = () => {
		this.props.navigation.goBack();
	};

	goNext = () => {
		this.props.navigation.navigate('AccountBackupStep5', { words: this.words });
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

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

	renderStepContent() {
		return (
			<View style={styles.wrapper} testID={'protect-your-account-screen'}>
				<View style={styles.content}>
					<Text style={styles.title}>{strings('account_backup_step_4.title')}</Text>
					<View style={styles.text}>
						<Text style={styles.label}>{strings('account_backup_step_4.info_text_1')}</Text>
					</View>

					<View style={styles.seedPhraseWrapper}>
						<View style={styles.colLeft}>
							{this.words.slice(0, 6).map((word, i) => (
								<Text key={`word_${i}`} style={styles.word}>
									{`${i + 1}. ${word}`}
								</Text>
							))}
						</View>
						<View style={styles.colRight}>
							{this.words.slice(-6).map((word, i) => (
								<Text key={`word_${i}`} style={styles.word}>
									{`${i + 7}. ${word}`}
								</Text>
							))}
						</View>
					</View>

					<View style={styles.text}>
						<Text style={styles.label}>{strings('account_backup_step_4.info_text_2')}</Text>
					</View>
				</View>
				<View style={styles.buttonWrapper}>
					<StyledButton
						containerStyle={styles.button}
						type={'confirm'}
						onPress={this.goNext}
						testID={'submit-button'}
					>
						{strings('account_backup_step_4.cta_text')}
					</StyledButton>
				</View>
			</View>
		);
	}

	renderConfirmPassword() {
		const { warningIncorrectPassword } = this.state;
		return (
			<View style={styles.wrapper}>
				<View style={[styles.content, styles.passwordRequiredContent]}>
					<Text style={styles.title}>{strings('account_backup_step_4.confirm_password')}</Text>
					<View style={styles.text}>
						<Text style={styles.label}>{strings('account_backup_step_4.before_continiuing')}</Text>
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
						{strings('account_backup_step_4.confirm')}
					</StyledButton>
				</View>
			</View>
		);
	}

	render() {
		const { ready, view } = this.state;
		if (!ready) return this.renderLoader();
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'account-backup-step-4-screen'}
				>
					<Pager pages={5} selected={3} />
					<TouchableOpacity onPress={this.dismiss} style={styles.navbarLeftButton}>
						<Text style={styles.navbarLeftText}>{strings('account_backup_step_4.back')}</Text>
					</TouchableOpacity>
					{view === SEED_PHRASE ? this.renderStepContent() : this.renderConfirmPassword()}
				</ScrollView>
			</SafeAreaView>
		);
	}
}
