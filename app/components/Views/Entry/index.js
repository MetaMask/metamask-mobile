import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Branch from 'react-native-branch';
import Engine from '../../../core/Engine';
import LottieView from 'lottie-react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import setOnboardingWizardStep from '../../../actions/wizard';
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Logger from '../../../util/Logger';
import Device from '../../../util/Device';
import { recreateVaultWithSamePassword } from '../../../core/Vault';
import {
	EXISTING_USER,
	ONBOARDING_WIZARD,
	METRICS_OPT_IN,
	ENCRYPTION_LIB,
	ORIGINAL,
	CURRENT_APP_VERSION,
	LAST_APP_VERSION
} from '../../../constants/storage';
import AppConstants from '../../../core/AppConstants';
import { getVersion } from 'react-native-device-info';

/**
 * Entry Screen that decides which screen to show
 * depending on the state of the user
 * new, existing , logged in or not
 * while showing the fox
 */
const LOGO_SIZE = 175;
const LOGO_PADDING = 25;
const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.white
	},
	metamaskName: {
		marginTop: 10,
		height: 25,
		width: 170,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	logoWrapper: {
		backgroundColor: colors.white,
		paddingTop: 50,
		marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2 - LOGO_PADDING,
		height: LOGO_SIZE + LOGO_PADDING * 2
	},
	foxAndName: {
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	animation: {
		width: 110,
		height: 110,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	fox: {
		width: 110,
		height: 110,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	}
});

class Entry extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Boolean flag that determines if password has been set
		 */
		passwordSet: PropTypes.bool,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * A string representing the selected address => account
		 */
		selectedAddress: PropTypes.string
	};

	state = {
		viewToGo: null
	};

	animation = React.createRef();
	animationName = React.createRef();
	opacity = new Animated.Value(1);

	async componentDidMount() {
		DeeplinkManager.init(this.props.navigation);
		this.unsubscribeFromBranch = Branch.subscribe(this.handleDeeplinks);
		const existingUser = await AsyncStorage.getItem(EXISTING_USER);

		const ola = new Date().getTime();
		try {
			const currentVersion = await getVersion();
			const savedVersion = await AsyncStorage.getItem(CURRENT_APP_VERSION);
			if (currentVersion !== savedVersion) {
				if (savedVersion) await AsyncStorage.setItem(LAST_APP_VERSION, savedVersion);
				await AsyncStorage.setItem(CURRENT_APP_VERSION, currentVersion);
			}
		} catch (error) {
			Logger.error(error);
		}
		console.log(ola - new Date().getTime());

		if (existingUser !== null) {
			await this.unlockKeychain();
		} else {
			this.animateAndGoTo('OnboardingRootNav');
		}
	}

	handleDeeplinks = async ({ error, params, uri }) => {
		if (error) {
			Logger.error(error, 'Error from Branch');
			return;
		}
		const deeplink = params['+non_branch_link'] || uri || null;
		if (deeplink) {
			const { KeyringController } = Engine.context;
			const isUnlocked = KeyringController.isUnlocked();
			isUnlocked
				? DeeplinkManager.parse(deeplink, { origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK })
				: DeeplinkManager.setDeeplink(deeplink);
		}
	};

	componentWillUnmount() {
		if (this.unsubscribeFromBranch) {
			this.unsubscribeFromBranch();
			this.unsubscribeFromBranch = null;
		}
	}

	animateAndGoTo(view) {
		this.setState({ viewToGo: view }, () => {
			if (Device.isAndroid()) {
				this.animation ? this.animation.play(0, 25) : this.onAnimationFinished();
				this.animationName && this.animationName.play();
			} else {
				this.animation.play();
				this.animationName.play();
			}
		});
	}

	onAnimationFinished = () => {
		const { viewToGo } = this.state;
		Animated.timing(this.opacity, {
			toValue: 0,
			duration: 300,
			useNativeDriver: true,
			isInteraction: false
		}).start(() => {
			if (viewToGo !== 'WalletView' || viewToGo !== 'Onboarding') {
				this.props.navigation.navigate(viewToGo);
			} else if (viewToGo === 'Onboarding') {
				this.props.navigation.navigate(
					'OnboardingRootNav',
					{},
					NavigationActions.navigate({ routeName: 'Oboarding' })
				);
			} else {
				this.props.navigation.navigate('HomeNav');
			}
		});
	};

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const { KeyringController } = Engine.context;
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials

				await KeyringController.submitPassword(credentials.password);
				const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
				if (encryptionLib !== ORIGINAL) {
					await recreateVaultWithSamePassword(credentials.password, this.props.selectedAddress);
					await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
				}
				// Get onboarding wizard state
				const onboardingWizard = await AsyncStorage.getItem(ONBOARDING_WIZARD);
				// Check if user passed through metrics opt-in screen
				const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
				if (!metricsOptIn) {
					this.animateAndGoTo('OptinMetrics');
				} else if (onboardingWizard) {
					this.animateAndGoTo('HomeNav');
				} else {
					this.props.setOnboardingWizardStep(1);
					this.animateAndGoTo('WalletView');
				}
			} else if (this.props.passwordSet) {
				this.animateAndGoTo('Login');
			} else {
				await KeyringController.submitPassword('');
				await SecureKeychain.resetGenericPassword();
				this.props.navigation.navigate('HomeNav');
			}
		} catch (error) {
			Logger.log(`Keychain couldn't be accessed`, error);
			this.animateAndGoTo('Login');
		}
	}

	renderAnimations() {
		if (!this.state.viewToGo) {
			return <LottieView style={styles.animation} autoPlay source={require('../../../animations/bounce.json')} />;
		}

		return (
			<View style={styles.foxAndName}>
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.animation = animation;
					}}
					style={styles.animation}
					loop={false}
					source={require('../../../animations/fox-in.json')}
					onAnimationFinish={this.onAnimationFinished}
				/>
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.animationName = animation;
					}}
					style={styles.metamaskName}
					loop={false}
					source={require('../../../animations/wordmark.json')}
				/>
			</View>
		);
	}

	render() {
		return (
			<View style={styles.main}>
				<Animated.View style={[styles.logoWrapper, { opacity: this.opacity }]}>
					<View style={styles.fox}>{this.renderAnimations()}</View>
				</Animated.View>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

const mapStateToProps = state => ({
	passwordSet: state.user.passwordSet,
	selectedAddress:
		state.engine.backgroundState.PreferencesController &&
		state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Entry);
