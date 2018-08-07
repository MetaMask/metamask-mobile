import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { KeyboardAvoidingView, Switch, Alert, Button, Text, View, TextInput, StyleSheet, Platform } from 'react-native';
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
	title: {
		fontSize: 35,
		fontWeight: 'bold',
		marginTop: 20,
		marginBottom: 20,
		color: colors.title
	},
	field: {
		marginBottom: 20
	},
	label: {
		fontSize: 14,
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
		backgroundColor: colors.primary,
		padding: 10,
		color: colors.white,
		borderRadius: 4
	},
	footer: {
		marginTop: 40
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * Main view component for the wallet screen
 */
export default class CreatePassword extends Component {
	static propTypes = {
		onPasswordSaved: PropTypes.func
	};

	state = {
		password: '',
		confirmPassword: '',
		biometryType: null,
		biometryChoice: false
	};

	componentDidMount() {
		Keychain.getSupportedBiometryType().then(biometryType => {
			this.setState({ biometryType, biometryChoice: true });
		});
	}

	onPressCreate = async () => {
		let error = null;
		if (this.state.password.length < 0) {
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
				// We should either force people to enable passcode / biometrics
				// or default to encryption in the same way as the extension
				if (error.toString() === PASSCODE_NOT_SET_ERROR) {
					Alert.alert(
						'Security Alert',
						'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)'
					);
				}
			}
		}
	};

	onPressImport = () => {
		console.log('TODO...'); // eslint-disable-line
	};

	onBiometryChoiceChange = value => {
		this.setState({ biometryChoice: value });
	};

	render() {
		return (
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
				<Screen>
					<View style={styles.wrapper}>
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
						<View style={styles.cta}>
							<Button style={styles.cta} title="CREATE" onPress={this.onPressCreate} color="#FFF" />
						</View>

						<View style={styles.footer}>
							<Button style={styles.seed} title="Import with seed phrase" onPress={this.onPressImport} />
						</View>
					</View>
				</Screen>
			</KeyboardAvoidingView>
		);
	}
}
