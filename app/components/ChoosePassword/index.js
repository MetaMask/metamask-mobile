import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	Switch,
	AsyncStorage,
	ActivityIndicator,
	Alert,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet,
	Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StyledButton from '../StyledButton';
import Engine from '../../core/Engine';

import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../Navbar';
import SecureKeychain from '../../core/SecureKeychain';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		width: 200,
		fontSize: 32,
		marginLeft: 20,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	subtitle: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginLeft: 20,
		marginBottom: 10,
		justifyContent: 'center'
	},

	label: {
		position: 'absolute',
		marginTop: -30,
		marginLeft: 5,
		fontSize: 16,
		color: colors.fontSecondary,
		textAlign: 'left',
		...fontStyles.normal
	},
	field: {
		marginBottom: 20
	},
	input: {
		borderBottomWidth: Platform.OS === 'android' ? 0 : 1,
		borderBottomColor: colors.borderColor,
		paddingLeft: 0,
		paddingVertical: 10,
		borderRadius: 4,
		fontSize: Platform.OS === 'android' ? 14 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20
	},
	errorMsg: {
		color: colors.error,
		...fontStyles.normal
	},
	biometrics: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 20,
		marginBottom: 30
	},
	biometryLabel: {
		flex: 1,
		fontSize: 16,
		...fontStyles.normal
	},
	biometrySwitch: {
		flex: 0
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set their password for the first time
 */
export default class ChoosePassword extends Component {
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
		biometryType: null,
		biometryChoice: false,
		labelsScaleNew: new Animated.Value(1),
		labelsScaleConfirm: new Animated.Value(1),
		loading: false,
		error: null
	};

	mounted = true;

	confirmPasswordInput = React.createRef();

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			this.setState({ biometryType, biometryChoice: true });
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressCreate = async () => {
		if (this.state.loading) return;
		let error = null;
		if (this.state.password.length < 8) {
			error = strings('choose_password.password_length_error');
		} else if (this.state.password !== this.state.confirmPassword) {
			error = strings('choose_password.password_dont_match');
		}
		if (error) {
			Alert.alert('Error', error);
		} else {
			try {
				this.setState({ loading: true });
				const { KeyringController } = Engine.context;
				await KeyringController.createNewVaultAndKeychain(this.state.password);

				const authOptions = {
					accessControl: this.state.biometryChoice
						? SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
						: SecureKeychain.ACCESS_CONTROL.DEVICE_PASSCODE
				};

				await SecureKeychain.setGenericPassword('metamask-user', this.state.password, authOptions);

				if (!this.state.biometryChoice) {
					await AsyncStorage.removeItem('@MetaMask:biometryChoice');
				} else {
					await AsyncStorage.setItem('@MetaMask:biometryChoice', this.state.biometryType);
				}

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

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	animateInLabel = label => {
		if (
			(label === 'new' && this.state.password !== '') ||
			(label === 'confirm' && this.state.confirmPassword !== '')
		) {
			return;
		}
		Animated.timing(label === 'new' ? this.state.labelsScaleNew : this.state.labelsScaleConfirm, {
			toValue: 1,
			duration: 200,
			useNativeDriver: true
		}).start();
	};

	animateOutLabel = label => {
		Animated.timing(label === 'new' ? this.state.labelsScaleNew : this.state.labelsScaleConfirm, {
			toValue: 0.66,
			duration: 200,
			useNativeDriver: true
		}).start();
	};

	render() {
		const startX = 0;
		const startY = 0;
		const width = 100;
		const height = 24;
		const initialScale = 1;
		const endX = 0;
		const endY = 50;

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<View style={styles.content}>
						<Text style={styles.title}>{strings('choose_password.title')}</Text>
						<View style={styles.text}>
							<Text style={styles.subtitle}>{strings('choose_password.subtitle')}</Text>
						</View>
					</View>
					<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
						<View testID={'create-password-screen'}>
							<View style={styles.field}>
								<Animated.Text
									style={[
										styles.label,
										{
											transform: [
												{
													scale: this.state.labelsScaleNew
												},
												{
													translateX: this.state.labelsScaleNew.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startX - width / 2 - (width * initialScale) / 2,
															endX
														]
													})
												},
												{
													translateY: this.state.labelsScaleNew.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startY - height / 2 - (height * initialScale) / 2,
															endY
														]
													})
												}
											]
										}
									]}
								>
									{strings('choose_password.password')}
								</Animated.Text>
								<TextInput
									style={styles.input}
									value={this.state.password}
									onChangeText={val => this.setState({ password: val })} // eslint-disable-line  react/jsx-no-bind
									secureTextEntry
									placeholder={''}
									underlineColorAndroid={colors.borderColor}
									testID={'input-password'}
									onSubmitEditing={this.jumpToConfirmPassword}
									returnKeyType={'next'}
									onFocus={() => this.animateOutLabel('new')}
									onBlur={() => this.animateInLabel('new')}
								/>
							</View>
							<View style={styles.field}>
								<Animated.Text
									style={[
										styles.label,
										{
											transform: [
												{
													scale: this.state.labelsScaleConfirm
												},
												{
													translateX: this.state.labelsScaleConfirm.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startX - width / 2 - (width * initialScale) / 2,
															endX
														]
													})
												},
												{
													translateY: this.state.labelsScaleConfirm.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startY - height / 2 - (height * initialScale) / 2,
															endY
														]
													})
												}
											]
										}
									]}
								>
									{strings('choose_password.confirm_password')}
								</Animated.Text>
								<TextInput
									ref={this.confirmPasswordInput}
									style={styles.input}
									value={this.state.confirmPassword}
									onChangeText={val => this.setState({ confirmPassword: val })} // eslint-disable-line  react/jsx-no-bind
									secureTextEntry
									placeholder={''}
									underlineColorAndroid={colors.borderColor}
									testID={'input-password-confirm'}
									onSubmitEditing={this.onPressCreate}
									returnKeyType={'done'}
									onFocus={() => this.animateOutLabel('confirm')}
									onBlur={() => this.animateInLabel('confirm')}
								/>
							</View>

							{this.state.error && <Text style={styles.errorMsg}>{this.state.error}</Text>}
							{this.state.biometryType && (
								<View style={styles.biometrics}>
									<Text style={styles.biometryLabel}>
										{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
									</Text>
									<Switch
										onValueChange={biometryChoice => this.setState({ biometryChoice })} // eslint-disable-line react/jsx-no-bind
										value={this.state.biometryChoice}
										style={styles.biometrySwitch}
										trackColor={
											Platform.OS === 'ios'
												? { true: colors.primary, false: colors.concrete }
												: null
										}
										ios_backgroundColor={colors.slate}
									/>
								</View>
							)}
							<View style={styles.ctaWrapper}>
								<StyledButton type={'blue'} onPress={this.onPressCreate} testID={'submit'}>
									{this.state.loading ? (
										<ActivityIndicator size="small" color="white" />
									) : (
										strings('choose_password.create_button')
									)}
								</StyledButton>
							</View>
						</View>
					</KeyboardAwareScrollView>
				</View>
			</SafeAreaView>
		);
	}
}
