import React, { PureComponent } from 'react';
import {
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	Keyboard,
	TouchableOpacity,
	TouchableWithoutFeedback,
	TextInput,
	Alert
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import Emoji from 'react-native-emoji';
import AsyncStorage from '@react-native-community/async-storage';
import OnboardingProgress from '../../UI/OnboardingProgress';
import ActionView from '../../UI/ActionView';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import AndroidBackHandler from '../AndroidBackHandler';
import ActionModal from '../../UI/ActionModal';
import Device from '../../../util/Device';
import Icon from 'react-native-vector-icons/Octicons';
import Confetti from '../../UI/Confetti';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { ONBOARDING_WIZARD, METRICS_OPT_IN } from '../../../constants/storage';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 50
	},
	hintWrapper: {
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 16,
		padding: 24
	},
	hintHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	recovery: {
		fontSize: 18,
		...fontStyles.extraBold,
		color: colors.fontPrimary
	},
	leaveHint: {
		fontSize: 14,
		...fontStyles.regular,
		color: colors.fontPrimary,
		marginBottom: 16
	},
	noSeedphrase: {
		fontSize: 14,
		...fontStyles.regular,
		color: colors.red,
		marginBottom: 16
	},
	hintInput: {
		borderRadius: 6,
		borderWidth: 1,
		borderColor: colors.grey500,
		padding: 16,
		minHeight: 76,
		paddingTop: 16
	},
	onBoardingWrapper: {
		paddingHorizontal: 20
	},
	congratulations: {
		fontSize: Device.isMediumDevice() ? 28 : 32,
		marginBottom: 12,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.extraBold
	},
	baseText: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	successText: {
		marginBottom: 32
	},
	hintText: {
		marginBottom: 26,
		color: colors.blue
	},
	learnText: {
		color: colors.blue
	},
	recoverText: {
		marginBottom: 26
	},
	emoji: {
		textAlign: 'center',
		fontSize: 65,
		marginBottom: 16
	}
});

/**
 * View that's shown during the last step of
 * the backup seed phrase flow
 */
class ManualBackupStep3 extends PureComponent {
	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	constructor(props) {
		super(props);
		this.steps = props.navigation.getParam('steps');
	}

	state = {
		currentStep: 4,
		showHint: false,
		hintText: ''
	};

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	toggleHint = () => {
		this.setState({ showHint: !this.state.showHint });
	};

	learnMore = () =>
		this.props.navigation.navigate('Webview', {
			url: 'https://support.metamask.io',
			title: strings('drawer.metamask_support')
		});

	isHintSeedPhrase = hintText => {
		const words = this.props.navigation.getParam('words');
		const lower = string => String(string).toLowerCase();
		return lower(hintText) === lower(words.join(' '));
	};

	saveSeedphrase = async () => {
		const { hintText } = this.state;
		if (!hintText) return;
		const currentSeedphraseHints = await AsyncStorage.getItem('seedphraseHints');
		const parsedHints = JSON.parse(currentSeedphraseHints);
		if (this.isHintSeedPhrase(hintText)) {
			Alert.alert('Error!', strings('manual_backup_step_3.no_seedphrase'));
			return;
		}
		this.toggleHint();
		await AsyncStorage.setItem('seedphraseHints', JSON.stringify({ ...parsedHints, manualBackup: hintText }));
	};

	done = async () => {
		const onboardingWizard = await AsyncStorage.getItem(ONBOARDING_WIZARD);
		// Check if user passed through metrics opt-in screen
		const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
		if (!metricsOptIn) {
			this.props.navigation.navigate('OptinMetrics');
		} else if (onboardingWizard) {
			this.props.navigation.navigate('HomeNav');
			this.props.navigation.popToTop();
			this.props.navigation.goBack(null);
		} else {
			this.props.navigation.navigate('HomeNav');
		}
	};

	handleChangeText = text => this.setState({ hintText: text });

	renderHint = () => {
		const { showHint, hintText } = this.state;
		return (
			<ActionModal
				confirmText={strings('manual_backup_step_3.save')}
				confirmButtonMode={'confirm'}
				onCancelPress={this.toggleHint}
				onConfirmPress={this.saveSeedphrase}
				modalVisible={showHint}
				onRequestClose={Keyboard.dismiss}
			>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
					<View style={styles.hintWrapper}>
						<View style={styles.hintHeader}>
							<Text style={styles.recovery}>{strings('manual_backup_step_3.recovery_hint')}</Text>
							<TouchableOpacity onPress={this.toggleHint}>
								<Icon name="x" size={16} />
							</TouchableOpacity>
						</View>
						<Text style={styles.leaveHint}>{strings('manual_backup_step_3.leave_hint')}</Text>
						<Text style={styles.noSeedphrase}>{strings('manual_backup_step_3.no_seedphrase')}</Text>
						<TextInput
							style={styles.hintInput}
							value={hintText}
							placeholder={strings('manual_backup_step_3.example')}
							onChangeText={this.handleChangeText}
							multiline
							textAlignVertical={'top'}
						/>
					</View>
				</TouchableWithoutFeedback>
			</ActionModal>
		);
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Confetti />
				<View style={styles.onBoardingWrapper}>
					<OnboardingProgress currentStep={this.state.currentStep} steps={this.steps} />
				</View>
				<ActionView
					confirmTestID={'manual-backup-step-3-done-button'}
					confirmText={strings('manual_backup_step_3.done')}
					onConfirmPress={this.done}
					showCancelButton={false}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper}>
						<Emoji name="tada" style={styles.emoji} />
						<Text style={styles.congratulations}>{strings('manual_backup_step_3.congratulations')}</Text>
						<Text style={[styles.baseText, styles.successText]}>
							{strings('manual_backup_step_3.success')}
						</Text>
						<TouchableOpacity onPress={this.toggleHint}>
							<Text style={[styles.baseText, styles.hintText]}>
								{strings('manual_backup_step_3.hint')}
							</Text>
						</TouchableOpacity>
						<Text style={[styles.baseText, styles.recoverText]}>
							{strings('manual_backup_step_3.recover')}
						</Text>
						<TouchableOpacity onPress={this.learnMore}>
							<Text style={[styles.baseText, styles.learnText]}>
								{strings('manual_backup_step_3.learn')}
							</Text>
						</TouchableOpacity>
					</View>
				</ActionView>
				{Device.isAndroid() && <AndroidBackHandler customBackPress={this.props.navigation.pop} />}
				{this.renderHint()}
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	null,
	mapDispatchToProps
)(ManualBackupStep3);
