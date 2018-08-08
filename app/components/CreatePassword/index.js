import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Switch,
	Alert,
	Button,
	Text,
	View,
	TextInput,
	StyleSheet,
	Platform,
	Image
} from 'react-native';
import { colors } from '../../styles/common';
import Screen from '../Screen';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center'
	},
	wrapper: {
		backgroundColor: colors.concrete,
		flex: 1,
		padding: 20
	},
	logoWrapper: {
		marginTop: 100,
		justifyContent: 'center',
		alignItems: 'center'
	},
	image: {
		width: 100,
		height: 100
	},
	title: {
		fontSize: 35,
		fontWeight: 'bold',
		marginTop: 20,
		marginBottom: 20,
		color: colors.title,
		justifyContent: 'center',
		textAlign: 'center'
	},
	field: {
		marginBottom: 10
	},
	label: {
		fontSize: 16,
		marginBottom: 10
	},
	input: {
		borderWidth: 1,
		borderColor: colors.asphalt,
		padding: 10,
		borderRadius: 4,
		fontSize: 20
	},
	cta: {
		marginTop: 30,
		backgroundColor: colors.primaryFox,
		padding: 10,
		color: colors.white,
		borderRadius: 4,
		height: 60,
		alignItems: 'center',
		justifyContent: 'center'
	},
	footer: {
		marginTop: 40
	},
	errorMsg: {
		color: colors.error
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * Main view component for the wallet screen
 */
export default class CreatePassword extends Component {
	static propTypes = {
		onPasswordSaved: PropTypes.func,
		loading: PropTypes.bool,
		error: PropTypes.string
	};

	state = {
		password: '',
		confirmPassword: '',
		biometryType: null,
		biometryChoice: false
	};

	mounted = true;

	componentDidMount() {
		Keychain.getSupportedBiometryType().then(biometryType => {
			this.mounted && this.setState({ biometryType, biometryChoice: true });
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressCreate = async () => {
		let error = null;
		if (this.state.password.length < 8) {
			error = 'The password needs to be at least 8 chars long';
		} else if (this.state.password !== this.state.confirmPassword) {
			error = "Password doesn't match";
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
				this.props.onPasswordSaved(this.state.password);
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

	onPressImport = () => false;

	onBiometryChoiceChange = value => {
		this.setState({ biometryChoice: value });
	};

	render() {
		return (
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
				<Screen>
					<View style={styles.wrapper}>
						<View style={styles.logoWrapper}>
							<Image
								source={require('../../images/fox.png')}
								style={styles.image}
								resizeMethod={'auto'}
							/>
						</View>
						<Text style={styles.title}>Create Password</Text>
						<View style={styles.field}>
							<Text style={styles.label}>New Password (min 8 chars)</Text>
							<TextInput
								style={styles.input}
								value={this.state.password}
								onChangeText={val => {
									this.setState({ password: val });
								}}
								secureTextEntry
								placeholder={''}
							/>
						</View>
						<View style={styles.field}>
							<Text style={styles.label}>Confirm Password</Text>
							<TextInput
								style={styles.input}
								value={this.state.confirmPassword}
								onChangeText={val => this.setState({ confirmPassword: val })}
								secureTextEntry
								placeholder={''}
							/>
						</View>

						{this.state.biometryType && (
							<View style={styles.field}>
								<Text style={styles.label}>Enable {this.state.biometryType}</Text>
								<Switch onValueChange={this.onBiometryChoiceChange} value={this.state.biometryChoice} />
							</View>
						)}
						{this.props.error && <Text style={styles.errorMsg}>{this.props.error}</Text>}
						<View style={styles.cta}>
							{this.props.loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Button style={styles.cta} title="CREATE" onPress={this.onPressCreate} color="#FFF" />
							)}
						</View>

						<View style={styles.footer}>
							<Button
								style={styles.seed}
								title="Import with seed phrase"
								onPress={this.onPressImport}
								color={colors.fontPrimary}
							/>
						</View>
					</View>
				</Screen>
			</KeyboardAvoidingView>
		);
	}
}
