import React, { Component } from 'react';
import { StyleSheet, Dimensions, Animated, View, AppState, Platform } from 'react-native';
import PropTypes from 'prop-types';
import LottieView from 'lottie-react-native';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import { baseStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';

const LOGO_SIZE = 175;
const styles = StyleSheet.create({
	metamaskName: {
		marginTop: 10,
		height: 25,
		width: 170,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	logoWrapper: {
		marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2,
		height: LOGO_SIZE
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
	timedOut = false;
	firstAnimation = React.createRef();
	secondAnimation = React.createRef();
	animationName = React.createRef();
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
			this.timeoutWatcher();
		}
	};

	timeoutWatcher() {
		setTimeout(() => {
			if (!this.state.ready) {
				Logger.log('Lockscreen::timeout - state', this.state);
				Logger.log('Lockscreen::timeout - appState', this.appState);
				Logger.log('Lockscreen::timeout - locked', this.locked);
				Logger.log('Lockscreen::timeout - errorUnlockingKeychain', this.errorUnlockingKeychain);
				Logger.error('Lockscreen::timeout', `${this.timedOut ? 10 : 5} sec timeout`);
				// Retry one more time
				if (!this.timedOut) {
					this.unlockKeychain();
					this.timeoutWatcher();
					this.timedOut = true;
				}
			}
		}, 5000);
	}

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this.handleAppStateChange);
	}

	async unlockKeychain() {
		let credentials = null;
		try {
			// Retreive the credentials
			Logger.log('Lockscreen::unlockKeychain - getting credentials');
			credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				Logger.log('Lockscreen::unlockKeychain - got credentials', !!credentials.password);

				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				Logger.log('Lockscreen::unlockKeychain - submitting password');

				await KeyringController.submitPassword(credentials.password);
				Logger.log('Lockscreen::unlockKeychain - keyring unlocked');

				this.locked = false;
				this.setState({ ready: true }, () => {
					Logger.log('Lockscreen::unlockKeychain - state: ready');
					if (Platform.OS === 'android') {
						setTimeout(() => {
							this.secondAnimation.play(0, 25);
							setTimeout(() => {
								this.animationName.play();
							}, 1);
						}, 50);
					} else {
						this.secondAnimation.play();
						this.animationName.play();
						Logger.log('Lockscreen::unlockKeychain - playing animations');
					}
				});
			} else {
				this.props.navigation.navigate('Login');
			}
		} catch (error) {
			Logger.error('Lockscreen:unlockKeychain', error);
		}
	}

	onAnimationFinished = () => {
		setTimeout(() => {
			Animated.timing(this.opacity, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
				isInteraction: false
			}).start(() => {
				this.props.navigation.goBack();
			});
		}, 100);
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
			<View style={styles.foxAndName}>
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.secondAnimation = animation;
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
			<View style={baseStyles.flexGrow}>
				<Animated.View style={[styles.logoWrapper, { opacity: this.opacity }]}>
					<View style={styles.fox}>{this.renderAnimations()}</View>
				</Animated.View>
			</View>
		);
	}
}
