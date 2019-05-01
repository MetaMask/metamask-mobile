import React, { Component } from 'react';
import { StyleSheet, Dimensions, Animated, View, Image, AppState } from 'react-native';
import PropTypes from 'prop-types';
import LottieView from 'lottie-react-native';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import { baseStyles } from '../../../styles/common';

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
/**
 * Main view component for the Lock screen
 */
export default class LockScreen extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		ready: false
	};

	appState = 'active';
	locked = true;
	firstAnimation = React.createRef();
	secondAnimation = React.createRef();
	opacity = new Animated.Value(1);

	componentDidMount() {
		// Check if is the app is launching or it went to background mode
		this.appState = 'background';
		AppState.addEventListener('change', this.handleAppStateChange);
		this.mounted = true;
	}

	waitForEngine() {
		setTimeout(() => {
			Engine.context ? this.unlockKeychain() : this.waitForEngine();
		}, 100);
	}

	handleAppStateChange = async nextAppState => {
		// Try to unlock when coming from the background
		if (this.locked && this.appState !== 'active' && nextAppState === 'active') {
			this.firstAnimation.play();
			this.appState = nextAppState;
			this.unlockKeychain();
		}
	};

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this.handleAppStateChange);
	}

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				await KeyringController.submitPassword(credentials.password);
				this.locked = false;
				this.setState({ ready: true }, () => {
					this.secondAnimation.play();
				});
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
		}
	}

	onAnimationFinished = () => {
		setTimeout(() => {
			Animated.timing(this.opacity, {
				toValue: 0,
				duration: 400,
				useNativeDriver: true,
				isInteraction: false
			}).start(() => {
				this.props.navigation.goBack();
			});
		}, 1750);
	};

	renderAnimations() {
		if (!this.state.ready) {
			return (
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.firstAnimation = animation;
					}}
					style={styles.animation}
					source={require('../../../animations/bounce.json')}
				/>
			);
		}

		return (
			<LottieView
				// eslint-disable-next-line react/jsx-no-bind
				ref={animation => {
					this.secondAnimation = animation;
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
