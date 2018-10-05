import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { 	Text, View, StyleSheet, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StyledButton from '../StyledButton';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Icon from 'react-native-vector-icons/FontAwesome';

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { strings } from '../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../Navbar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 30
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 0,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	text: {
		textAlign: 'center',
		fontSize: 16,
		marginTop: 50,
		marginBottom: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	separator: {
		marginTop: 60,
		marginBottom: 10,
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

	onPressImport = () => {
		this.props.navigation.push('ImportFromSeed');
	};

	onPressSync = () => {
		this.props.navigation.push('SyncWithExtension');
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
						<Text style={styles.title}>Import Wallet</Text>

						<Text style={styles.text}>If you have access to your computer where you have your MetaMask Browser Extension installed, we recommend you to choose "Sync from Browser Extension", since it will preserve all your accounts, settings, etc.</Text>
						<View style={styles.ctaWrapper}>
							<StyledButton
								type={'blue'}
								onPress={this.onPressSync}
								testID={'onboarding-import-button'}
							>
								Sync from Browser Extension
							</StyledButton>
						</View>
						<Text style={[styles.text, styles.separator]}>If you don't have access to your computer, but you have your seed phrase you can choose "Import from Seed phrase"</Text>

						<View style={styles.ctaWrapper}>
							<StyledButton
								type={'normal'}
								onPress={this.onPressImport}
								testID={'onboarding-new-button'}
								containerStyle={{borderWidth: 0}}
							>
								Import using Seed Phrase
							</StyledButton>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</Screen>
		);
	}
}
