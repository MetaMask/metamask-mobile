import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, Dimensions, StyleSheet, Image, View } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Engine from '../../../core/Engine';
import LottieView from 'lottie-react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import { baseStyles } from '../../../styles/common';
import setOnboardingWizardStep from '../../../actions/wizard';
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';

/**
 * Entry Screen that decides which screen to show
 * depending on the state of the user
 * new, existing , logged in or not
 * while showing the fox
 */
const LOGO_SIZE = 194;
const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const styles = StyleSheet.create({
	metamaskName: {
		marginLeft: 6,
		height: 30,
		width: 190,
		alignSelf: 'center'
	},
	logoWrapper: {
		marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2,
		height: LOGO_SIZE
	},
	animation: {
		width: 400,
		height: 400
	},
	fox: {
		width: 125,
		height: 125,
		alignSelf: 'center',
		justifyContent: 'center',
		alignItems: 'center'
	}
});

class Entry extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	state = {
		viewToGo: null
	};

	animation = React.createRef();
	opacity = new Animated.Value(1);

	componentDidMount() {
		setTimeout(async () => {
			const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
			if (existingUser !== null) {
				await this.unlockKeychain();
			} else {
				this.animateAndGoTo('OnboardingRootNav');
			}
		}, 1900);
	}

	animateAndGoTo(view) {
		this.setState({ viewToGo: view }, () => {
			this.animation.play();
		});
	}

	onAnimationFinished = () => {
		setTimeout(() => {
			Animated.timing(this.opacity, {
				toValue: 0,
				duration: 400,
				useNativeDriver: true,
				isInteraction: false
			}).start(() => {
				this.props.navigation.navigate(this.state.viewToGo);
			});
		}, 1750);
	};

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				await KeyringController.submitPassword(credentials.password);
				// Get onboarding wizard state
				const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
				// Check if user passed through metrics opt-in screen
				const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
				if (!metricsOptIn) {
					this.props.navigation.navigate('OptinMetrics');
				} else if (onboardingWizard) {
					this.props.navigation.navigate('HomeNav');
				} else {
					this.props.setOnboardingWizardStep(1);
					this.props.navigation.navigate(
						'HomeNav',
						{},
						NavigationActions.navigate({ routeName: 'WalletView' })
					);
				}
			} else {
				this.animateAndGoTo('Login');
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
			this.animateAndGoTo('Login');
		}
	}

	renderAnimations() {
		if (!this.state.viewToGo) {
			return (
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					style={styles.animation}
					autoPlay
					source={require('../../../animations/bounce.json')}
				/>
			);
		}

		return (
			<LottieView
				// eslint-disable-next-line react/jsx-no-bind
				ref={animation => {
					this.animation = animation;
				}}
				style={styles.animation}
				loop={false}
				source={require('../../../animations/fox-in-out.json')}
				onAnimationFinish={this.onAnimationFinished}
			/>
		);
	}

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<Animated.View style={[styles.logoWrapper, { opacity: this.opacity }]}>
					<View style={styles.fox}>{this.renderAnimations()}</View>
					<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
				</Animated.View>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	null,
	mapDispatchToProps
)(Entry);
