import React, { useState, useRef, useEffect, useCallback } from 'react';
import { withNavigation } from 'react-navigation';
import PropTypes from 'prop-types';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Branch from 'react-native-branch';
import Engine from '../../../core/Engine';
import LottieView from 'lottie-react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Logger from '../../../util/Logger';
import Device from '../../../util/Device';
import { recreateVaultWithSamePassword } from '../../../core/Vault';
import { EXISTING_USER, ONBOARDING_WIZARD, METRICS_OPT_IN, ENCRYPTION_LIB, ORIGINAL } from '../../../constants/storage';

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

const Entry = props => {
	const [viewToGo, setViewToGo] = useState(null);

	const animation = useRef(null);
	const animationName = useRef(null);
	const opacity = new Animated.Value(1);

	const handleDeeplinks = async ({ error, params, uri }) => {
		if (error) {
			Logger.error(error, 'Error from Branch');
			return;
		}
		const deeplink = params['+non_branch_link'] || uri || null;
		if (deeplink) {
			const { KeyringController } = Engine.context;
			const isUnlocked = KeyringController.isUnlocked();
			isUnlocked ? DeeplinkManager.parse(deeplink) : DeeplinkManager.setDeeplink(deeplink);
		}
	};

	const onAnimationFinished = useCallback(() => {
		Animated.timing(opacity, {
			toValue: 0,
			duration: 300,
			useNativeDriver: true,
			isInteraction: false
		}).start(() => {
			if (viewToGo !== 'WalletView' || viewToGo !== 'Onboarding') {
				props.navigation.navigate(viewToGo);
			} else if (viewToGo === 'Onboarding') {
				props.navigation.navigate('OnboardingRootNav');
			} else {
				props.navigation.navigate('HomeNav');
			}
		});
	}, [opacity, viewToGo, props.navigation]);

	const animateAndGoTo = useCallback(
		viewToGo => {
			setViewToGo(viewToGo);
			if (Device.isAndroid()) {
				animation ? animation.play(0, 25) : onAnimationFinished();
				animationName && animationName.play();
			} else {
				animation && animation.current && animation.current.play();
				animation && animation.current && animationName.current.play();
			}
		},
		[onAnimationFinished]
	);

	const unlockKeychain = useCallback(async () => {
		try {
			// Retreive the credentials
			const { KeyringController } = Engine.context;
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials

				await KeyringController.submitPassword(credentials.password);
				const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
				if (encryptionLib !== ORIGINAL) {
					await recreateVaultWithSamePassword(credentials.password, props.selectedAddress);
					await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
				}
				// Get onboarding wizard state
				const onboardingWizard = await AsyncStorage.getItem(ONBOARDING_WIZARD);
				// Check if user passed through metrics opt-in screen
				const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
				if (!metricsOptIn) {
					animateAndGoTo('OptinMetrics');
				} else if (onboardingWizard) {
					animateAndGoTo('HomeNav');
				} else {
					props.setOnboardingWizardStep(1);
					animateAndGoTo('WalletView');
				}
			} else if (props.passwordSet) {
				animateAndGoTo('Login');
			} else {
				await KeyringController.submitPassword('');
				await SecureKeychain.resetGenericPassword();
				props.navigation.navigate('HomeNav');
			}
		} catch (error) {
			Logger.log(`Keychain couldn't be accessed`, error);
			animateAndGoTo('Login');
		}
	}, [animateAndGoTo, props]);

	useEffect(() => {
		// let unsubscribeFromBranch;
		DeeplinkManager.init(props.navigation);
		Branch.subscribe(handleDeeplinks);
		AsyncStorage.getItem(EXISTING_USER).then(existingUser => {
			if (existingUser !== null) {
				unlockKeychain();
			} else {
				animateAndGoTo('OnboardingRootNav');
			}
		});

		// return unsubscribeFromBranch => {
		// 	unsubscribeFromBranch && unsubscribeFromBranch();
		// };
	}, [props.navigation, animateAndGoTo, unlockKeychain]);

	const renderAnimations = () => {
		if (!viewToGo) {
			return <LottieView style={styles.animation} autoPlay source={require('../../../animations/bounce.json')} />;
		}

		return (
			<View style={styles.foxAndName}>
				<LottieView
					ref={animation}
					style={styles.animation}
					loop={false}
					source={require('../../../animations/fox-in.json')}
					onAnimationFinish={onAnimationFinished}
				/>
				<LottieView
					ref={animationName}
					style={styles.metamaskName}
					loop={false}
					source={require('../../../animations/wordmark.json')}
				/>
			</View>
		);
	};

	return (
		<View style={styles.main}>
			<Animated.View style={[styles.logoWrapper, { opacity }]}>
				<View style={styles.fox}>{renderAnimations()}</View>
			</Animated.View>
		</View>
	);
};

Entry.propTypes = {
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
)(withNavigation(Entry));
