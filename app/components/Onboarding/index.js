import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { 	Text, View, StyleSheet, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StyledButton from '../StyledButton';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { strings } from '../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../Navbar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 60
	},
	logoWrapper: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	fox: {
		marginTop: 45,
		width: 128,
		height: 119
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 14,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.normal
	},
	bigText: {
		textAlign: 'center',
		fontSize: 22,
		marginTop: 50,
		marginBottom: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	smallText: {
		fontSize: 18,
		textAlign: 'center',
		marginTop: 12,
		marginBottom: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	separator: {
		marginBottom: 0
	},
	ctaWrapper: {
		marginTop: 10
	}
});


/**
 * View where users can set their password for the first time
 */
export default class Onboarding extends Component {

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
		biometryChoice: false
	};

	mounted = true;

	confirmPasswordInput = React.createRef();

	componentDidMount() {
		Keychain.getSupportedBiometryType().then(biometryType => {
			this.mounted && this.setState({ biometryType, biometryChoice: true });
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressCreate = () => {
		this.props.navigation.push('CreatePassword');
	};

	onPressImport = () => {
		this.props.navigation.push('ImportWallet');
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	render() {
		return (
			<Screen>
				<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
					<View testID={'create-password-screen'}>
						<View style={styles.logoWrapper}>
							<Image source={require('../../images/fox.png')} style={styles.fox} resizeMethod={'auto'} />
						</View>
						<Text style={styles.title}>Welcome</Text>
						<Text style={styles.subtitle}>The decentralized web awaits</Text>

						<Text style={styles.bigText}>Let's get started!</Text>
						<Text style={styles.smallText}>Already using MetaMask?</Text>

						<View style={styles.ctaWrapper}>
							<StyledButton
								type={'blue'}
								onPress={this.onPressImport}
								testID={'onboarding-import-button'}
							>
								Import Wallet
							</StyledButton>
						</View>
						<Text style={[styles.smallText, styles.separator]}>OR</Text>

						<View style={styles.ctaWrapper}>
							<StyledButton type={'blue'} onPress={this.onPressCreate} testID={'onboarding-new-button'}>
								Create New Wallet
							</StyledButton>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</Screen>
		);
	}
}
