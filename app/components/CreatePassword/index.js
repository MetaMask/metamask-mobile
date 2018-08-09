import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	ActivityIndicator,
	ScrollView,
	Switch,
	Alert,
	Text,
	View,
	TextInput,
	StyleSheet,
	Platform,
	Image
} from 'react-native';
import Button from 'react-native-button';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.concrete,
		flex: 1,
		padding: 20
	},
	logoWrapper: {
		marginTop: Platform.OS === 'android' ? 40 : 100,
		justifyContent: 'center',
		alignItems: 'center'
	},
	image: {
		width: 100,
		height: 100
	},
	title: {
		fontSize: Platform.OS === 'android' ? 30 : 35,
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
	ctaText: {
		color: colors.white,
		...fontStyles.bold
	},
	cta: {
		flex: 1,
		backgroundColor: colors.primaryFox,
		borderRadius: 4,
		height: 50,
		justifyContent: 'center'
	},
	footer: {
		marginTop: 40
	},
	errorMsg: {
		color: colors.error,
		...fontStyles.normal
	},
	seed: {
		color: colors.fontSecondary,
		...fontStyles.normal
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set their password for the first time
 */
export default class CreatePassword extends Component {
	static propTypes = {
		/**
		 * Function that will be called once the form is submitted
		 */
		onPasswordSaved: PropTypes.func,
		/**
		 * Boolean that lets the view know if the parent is doing any processing
		 * and if that's the case, show a spinner
		 */
		loading: PropTypes.bool,
		/**
		 * String that contains any error message
		 */
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
			error = `Password doesn't match`;
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
			<Screen>
				<ScrollView style={styles.wrapper}>
					<View style={styles.logoWrapper}>
						<Image source={require('../../images/fox.png')} style={styles.image} resizeMethod={'auto'} />
					</View>
					<Text style={styles.title}>Create Password</Text>
					<View style={styles.field}>
						<Text style={styles.label}>New Password (min 8 chars)</Text>
						<TextInput
							style={styles.input}
							value={this.state.password}
							onChangeText={val => this.setState({ password: val })} // eslint-disable-line  react/jsx-no-bind
							secureTextEntry
							placeholder={''}
							underlineColorAndroid={colors.borderColor}
						/>
					</View>
					<View style={styles.field}>
						<Text style={styles.label}>Confirm Password</Text>
						<TextInput
							style={styles.input}
							value={this.state.confirmPassword}
							onChangeText={val => this.setState({ confirmPassword: val })} // eslint-disable-line  react/jsx-no-bind
							secureTextEntry
							placeholder={''}
							underlineColorAndroid={colors.borderColor}
						/>
					</View>

					{this.state.biometryType && (
						<View style={styles.field}>
							<Text style={styles.label}>Enable {this.state.biometryType}</Text>
							<Switch onValueChange={this.onBiometryChoiceChange} value={this.state.biometryChoice} />
						</View>
					)}
					{this.props.error && <Text style={styles.errorMsg}>{this.props.error}</Text>}
					<View style={styles.ctaWrapper}>
						<Button style={styles.ctaText} containerStyle={styles.cta} onPress={this.onPressCreate}>
							{this.props.loading ? <ActivityIndicator size="small" color="white" /> : 'CREATE'}
						</Button>
					</View>

					<View style={styles.footer}>
						<Button style={styles.seed} onPress={this.onPressImport}>
							Import with seed phrase
						</Button>
					</View>
				</ScrollView>
			</Screen>
		);
	}
}
