import React, { PureComponent } from 'react';
import { Alert, Text, View, SafeAreaView, StyleSheet, Keyboard, TouchableOpacity } from 'react-native';
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
import Device from '../../../util/Device';
import Confetti from '../../UI/Confetti';
import HintModal from '../../UI/HintModal';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { ONBOARDING_WIZARD, METRICS_OPT_IN, SEED_PHRASE_HINTS } from '../../../constants/storage';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 50
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
		this.steps = props.navigation.getParam('steps', undefined);
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

	componentDidMount = async () => {
		const currentSeedphraseHints = await AsyncStorage.getItem(SEED_PHRASE_HINTS);
		const parsedHints = currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
		const manualBackup = parsedHints?.manualBackup;
		this.setState({
			hintText: manualBackup
		});
	};

	toggleHint = () => {
		this.setState(state => ({ showHint: !state.showHint }));
	};

	learnMore = () =>
		this.props.navigation.navigate('Webview', {
			url: 'https://support.metamask.io',
			title: strings('drawer.metamask_support')
		});

	isHintSeedPhrase = hintText => {
		const words = this.props.navigation.getParam('words');
		if (words) {
			const lower = string => String(string).toLowerCase();
			return lower(hintText) === lower(words.join(' '));
		}
		return false;
	};

	saveHint = async () => {
		const { hintText } = this.state;
		if (!hintText) return;
		if (this.isHintSeedPhrase(hintText)) {
			Alert.alert('Error!', strings('manual_backup_step_3.no_seedphrase'));
			return;
		}
		this.toggleHint();
		const currentSeedphraseHints = await AsyncStorage.getItem(SEED_PHRASE_HINTS);
		const parsedHints = JSON.parse(currentSeedphraseHints);
		await AsyncStorage.setItem(SEED_PHRASE_HINTS, JSON.stringify({ ...parsedHints, manualBackup: hintText }));
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
			<HintModal
				onConfirm={this.saveHint}
				onCancel={this.toggleHint}
				modalVisible={showHint}
				onRequestClose={Keyboard.dismiss}
				value={hintText}
				onChangeText={this.handleChangeText}
			/>
		);
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<Confetti />
				{this.steps ? (
					<View style={styles.onBoardingWrapper}>
						<OnboardingProgress currentStep={this.state.currentStep} steps={this.steps} />
					</View>
				) : null}
				<ActionView
					confirmTestID={'manual-backup-step-3-done-button'}
					confirmText={strings('manual_backup_step_3.done')}
					onConfirmPress={this.done}
					showCancelButton={false}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper} testID={'import-congrats-screen'}>
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
