import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, Alert, Text, View, TextInput, StyleSheet, Platform, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button from 'react-native-button';
import StyledButton from '../StyledButton';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.concrete,
		flex: 1,
		padding: 20
	},
	logoWrapper: {
		marginTop: Platform.OS === 'android' ? 20 : 50,
		justifyContent: 'center',
		alignItems: 'center'
	},
	image: {
		width: 100,
		height: 100
	},
	title: {
		fontSize: Platform.OS === 'android' ? 20 : 25,
		marginTop: 20,
		marginBottom: 20,
		color: colors.title,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	field: {
		marginBottom: Platform.OS === 'android' ? 0 : 10
	},
	label: {
		fontSize: 16,
		marginBottom: Platform.OS === 'android' ? 0 : 10,
		marginTop: 10
	},
	input: {
		borderWidth: Platform.OS === 'android' ? 0 : 1,
		borderColor: colors.borderColor,
		padding: 10,
		borderRadius: 4,
		fontSize: Platform.OS === 'android' ? 15 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20
	},
	footer: {
		marginTop: 40
	},
	errorMsg: {
		color: colors.error,
		textAlign: 'center',
		...fontStyles.normal
	},
	seed: {
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	seedPhrase: {
		marginTop: 10,
		marginBottom: 10,
		backgroundColor: colors.white,
		paddingTop: 20,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		fontSize: 20,
		borderRadius: 10,
		height: 110,
		...fontStyles.normal
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set restore their account
 * using a seed phrase
 */
export default class ImportFromSeed extends Component {
	static propTypes = {
		/**
		 * Function that will be called once the form is submitted
		 */
		onImportFromSeed: PropTypes.func,
		/**
		 * Boolean that lets the view know if the parent is doing any processing
		 * and if that's the case, show a spinner
		 */
		loading: PropTypes.bool,
		/**
		 * String that contains any error message
		 */
		error: PropTypes.string,
		/**
		 * Function that will toggle the visibility of this view
		 */
		toggleImportFromSeed: PropTypes.func
	};

	state = {
		password: '',
		confirmPassword: '',
		seed: '',
		biometryType: null,
		biometryChoice: false
	};

	mounted = true;

	passwordInput = React.createRef();
	confirmPasswordInput = React.createRef();

	componentDidMount() {
		Keychain.getSupportedBiometryType().then(biometryType => {
			this.mounted && this.setState({ biometryType, biometryChoice: true });
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressImport = async () => {
		let error = null;
		if (this.state.password.length < 8) {
			error = 'The password needs to be at least 8 chars long';
		} else if (this.state.password !== this.state.confirmPassword) {
			error = `Password doesn't match`;
		}

		if (this.state.seed.split(' ').length !== 12) {
			error = 'The seed needs to be 12 words';
		}

		if (error) {
			Alert.alert('Error', error);
		} else {
			try {
				const authOptions = {
					accessControl: this.state.biometryChoice
						? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
						: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
					accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
					authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
				};
				await Keychain.setGenericPassword('metamask-user', this.state.password, authOptions);
				this.props.onImportFromSeed(this.state.password, this.state.seed);
			} catch (error) {
				// Should we force people to enable passcode / biometrics?
				if (error.toString() === PASSCODE_NOT_SET_ERROR) {
					Alert.alert(
						'Security Alert',
						'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)'
					);
				}
			}
		}
	};

	onCancel = () => this.props.toggleImportFromSeed();

	onBiometryChoiceChange = value => {
		this.setState({ biometryChoice: value });
	};

	onSeedWordsChange = value => {
		this.setState({ seed: value.toLowerCase() });
	};

	onPasswordChange = val => {
		this.setState({ password: val });
	};

	onPasswordConfirmChange = val => {
		this.setState({ confirmPassword: val });
	};

	jumpToPassword = () => {
		const { current } = this.passwordInput;
		current && current.focus();
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	render() {
		return (
			<Screen>
				<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
					<View testID={'import-from-seed-screen'}>
						<View style={styles.logoWrapper}>
							<Image
								source={require('../../images/fox.png')}
								style={styles.image}
								resizeMethod={'auto'}
							/>
						</View>
						<Text style={styles.title}>{strings('importFromSeed.title')}</Text>
						<TextInput
							value={this.state.seedWords}
							numberOfLines={3}
							multiline
							style={styles.seedPhrase}
							placeholder={strings('importFromSeed.seed_phrase_placeholder')}
							onChangeText={this.onSeedWordsChange}
							testID={'input-seed-phrase'}
							blurOnSubmit
							onSubmitEditing={this.jumpToPassword}
							returnKeyType={'next'}
						/>
						<View style={styles.field}>
							<Text style={styles.label}>{strings('importFromSeed.new_password')}</Text>
							<TextInput
								ref={this.passwordInput}
								style={styles.input}
								value={this.state.password}
								onChangeText={this.onPasswordChange}
								secureTextEntry
								placeholder={''}
								underlineColorAndroid={colors.borderColor}
								testID={'input-password'}
								onSubmitEditing={this.jumpToConfirmPassword}
								returnKeyType={'next'}
							/>
						</View>
						<View style={styles.field}>
							<Text style={styles.label}>{strings('importFromSeed.confirm_password')}</Text>
							<TextInput
								ref={this.confirmPasswordInput}
								style={styles.input}
								value={this.state.confirmPassword}
								onChangeText={this.onPasswordConfirmChange}
								secureTextEntry
								placeholder={''}
								underlineColorAndroid={colors.borderColor}
								testID={'input-password-confirm'}
								onSubmitEditing={this.onPressImport}
								returnKeyType={'done'}
							/>
						</View>

						{this.props.error && <Text style={styles.errorMsg}>{this.props.error}</Text>}
						<View style={styles.ctaWrapper}>
							<StyledButton type={'orange'} onPress={this.onPressImport} testID={'submit'}>
								{this.props.loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									strings('importFromSeed.import_button')
								)}
							</StyledButton>
						</View>

						<View style={styles.footer}>
							<Button style={styles.seed} onPress={this.onCancel}>
								{strings('importFromSeed.cancel_button')}
							</Button>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</Screen>
		);
	}
}
