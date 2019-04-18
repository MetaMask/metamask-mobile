import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Engine from '../../../core/Engine';
import LottieView from 'lottie-react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import { baseStyles } from '../../../styles/common';
/**
 * Entry Screen that decides which screen to show
 * depending on the state of the user
 * new, existing , logged in or not
 * while showing the fox
 */
const LOGO_SIZE = 194;
const styles = StyleSheet.create({
	metamaskName: {
		marginTop: 10,
		height: 30,
		width: 190,
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
		width: 125,
		height: 125,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	fox: {
		width: 125,
		height: 125,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	}
});

export default class Entry extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		viewToGo: null
	};

	animation = React.createRef();
	animationName = React.createRef();
	opacity = new Animated.Value(1);

	componentDidMount() {
		setTimeout(async () => {
			const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
			if (existingUser !== null) {
				await this.unlockKeychain();
			} else {
				this.animateAndGoTo('OnboardingRootNav');
			}
		}, 800);
	}

	animateAndGoTo(view) {
		this.setState({ viewToGo: view }, () => {
			this.animation.play();
			this.animationName.play();
		});
	}

	onAnimationFinished = () => {
		setTimeout(() => {
			Animated.timing(this.opacity, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
				isInteraction: false
			}).start(() => {
				this.props.navigation.navigate(this.state.viewToGo);
			});
		}, 100);
	};

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				await KeyringController.submitPassword(credentials.password);
				this.animateAndGoTo('HomeNav');
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
			<View style={baseStyles.flexGrow}>
				<Animated.View style={[styles.logoWrapper, { opacity: this.opacity }]}>
					<View style={styles.fox}>{this.renderAnimations()}</View>
				</Animated.View>
			</View>
		);
	}
}
