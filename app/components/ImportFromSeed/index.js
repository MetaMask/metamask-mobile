import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AsyncStorage, ActivityIndicator, Alert, Text, View, TextInput, StyleSheet, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getOnboardingNavbarOptions } from '../Navbar';
import StyledButton from '../StyledButton';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Engine from '../../core/Engine';

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
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
	errorMsg: {
		color: colors.error,
		textAlign: 'center',
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
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		...fontStyles.normal
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set restore their account
 * using a seed phrase
 */
export default class ImportFromSeed extends Component {
	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		password: '',
		confirmPassword: '',
		seed: '',
		biometryType: null,
		biometryChoice: false,
		loading: false,
		error: null
	};

	mounted = true;

	passwordInput = React.createRef();
	confirmPasswordInput = React.createRef();

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
				this.setState({ loading: true });

				const biometryType = await Keychain.getSupportedBiometryType();
				if (biometryType) {
					this.setState({ biometryType, biometryChoice: true });
				}

				const authOptions = {
					accessControl: this.state.biometryChoice
						? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
						: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
					accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
					authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
				};
				await Keychain.setGenericPassword('metamask-user', this.state.password, authOptions);
				const { KeyringController } = Engine.context;

				await KeyringController.createNewVaultAndRestore(this.state.password, this.state.seed);
				// mark the user as existing so it doesn't see the create password screen again
				await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
				this.setState({ loading: false });
				this.props.navigation.navigate('HomeNav');
			} catch (error) {
				// Should we force people to enable passcode / biometrics?
				if (error.toString() === PASSCODE_NOT_SET_ERROR) {
					Alert.alert(
						'Security Alert',
						'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)'
					);
					this.setState({ loading: false });
				} else {
					this.setState({ loading: false, error: error.toString() });
				}
			}
		}
	};

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
						<Text style={styles.title}>{strings('import_from_seed.title')}</Text>
						<TextInput
							value={this.state.seedWords}
							numberOfLines={3}
							multiline
							style={styles.seedPhrase}
							placeholder={strings('import_from_seed.seed_phrase_placeholder')}
							onChangeText={this.onSeedWordsChange}
							testID={'input-seed-phrase'}
							blurOnSubmit
							onSubmitEditing={this.jumpToPassword}
							returnKeyType={'next'}
						/>
						<View style={styles.field}>
							<Text style={styles.label}>{strings('import_from_seed.new_password')}</Text>
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
							<Text style={styles.label}>{strings('import_from_seed.confirm_password')}</Text>
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

						{this.state.error && <Text style={styles.errorMsg}>{this.state.error}</Text>}
						<View style={styles.ctaWrapper}>
							<StyledButton type={'blue'} onPress={this.onPressImport} testID={'submit'}>
								{this.state.loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									strings('import_from_seed.import_button')
								)}
							</StyledButton>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</Screen>
		);
	}
}
