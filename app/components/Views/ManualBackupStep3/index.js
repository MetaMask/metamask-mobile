import React, { PureComponent } from 'react';
import {
	Alert,
	BackHandler,
	Text,
	View,
	StyleSheet,
	Keyboard,
	TouchableOpacity,
	InteractionManager,
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
import Device from '../../../util/device';
import Confetti from '../../UI/Confetti';
import HintModal from '../../UI/HintModal';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { ONBOARDING_WIZARD, SEED_PHRASE_HINTS } from '../../../constants/storage';
import AnalyticsV2 from '../../../util/analyticsV2';
import DefaultPreference from 'react-native-default-preference';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	actionView: {
		paddingTop: 40,
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 50,
	},
	onBoardingWrapper: {
		paddingHorizontal: 20,
	},
	congratulations: {
		fontSize: Device.isMediumDevice() ? 28 : 32,
		marginBottom: 12,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold,
	},
	baseText: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal,
	},
	successText: {
		marginBottom: 32,
	},
	hintText: {
		marginBottom: 26,
		color: colors.blue,
	},
	learnText: {
		color: colors.blue,
	},
	recoverText: {
		marginBottom: 26,
	},
	emoji: {
		textAlign: 'center',
		fontSize: 65,
		marginBottom: 16,
	},
});

const hardwareBackPress = () => ({});
const HARDWARE_BACK_PRESS = 'hardwareBackPress';

/**
 * View that's shown during the last step of
 * the backup seed phrase flow
 */
class ManualBackupStep3 extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransparentOnboardingNavbarOptions(navigation);

	constructor(props) {
		super(props);
		this.steps = props.route.params?.steps;
	}

	state = {
		currentStep: 4,
		showHint: false,
		hintText: '',
	};

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	componentWillUnmount = () => {
		BackHandler.removeEventListener(HARDWARE_BACK_PRESS, hardwareBackPress);
	};

	componentDidMount = async () => {
		const currentSeedphraseHints = await AsyncStorage.getItem(SEED_PHRASE_HINTS);
		const parsedHints = currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
		const manualBackup = parsedHints?.manualBackup;
		this.setState({
			hintText: manualBackup,
		});
		InteractionManager.runAfterInteractions(() => {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SECURITY_COMPLETED);
		});
		BackHandler.addEventListener(HARDWARE_BACK_PRESS, hardwareBackPress);
	};

	toggleHint = () => {
		this.setState((state) => ({ showHint: !state.showHint }));
	};

	learnMore = () =>
		this.props.navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: 'https://support.metamask.io',
				title: strings('drawer.metamask_support'),
			},
		});

	isHintSeedPhrase = (hintText) => {
		const words = this.props.route.params?.words;
		if (words) {
			const lower = (string) => String(string).toLowerCase();
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
		InteractionManager.runAfterInteractions(() => {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SECURITY_RECOVERY_HINT_SAVED);
		});
	};

	done = async () => {
		const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
		if (onboardingWizard) {
			this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
		} else {
			this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
		}
	};

	handleChangeText = (text) => this.setState({ hintText: text });

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
			<View style={styles.mainWrapper}>
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
					style={styles.actionView}
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
			</View>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(null, mapDispatchToProps)(ManualBackupStep3);
