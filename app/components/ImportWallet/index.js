import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Text, View, ScrollView, StyleSheet } from 'react-native';
import Screen from '../Screen';
import StyledButton from '../StyledButton';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../Navbar';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 30,
		paddingBottom: 30
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
		marginBottom: 10
	},
	ctaWrapper: {
		marginTop: 10
	},
	importFromSeedBtn: { borderWidth: 0 }
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
				<ScrollView style={styles.flex} contentContainerStyle={styles.wrapper} testID={'import-wallet-screen'}>
					<Text style={styles.title}>{strings('importWallet.title')}</Text>

					<Text style={styles.text}>{strings('importWallet.sync_help')}</Text>
					<View style={styles.ctaWrapper}>
						<StyledButton type={'blue'} onPress={this.onPressSync} testID={'onboarding-import-button'}>
							{strings('importWallet.sync_from_browser_extension_button')}
						</StyledButton>
					</View>
					<Text style={[styles.text, styles.separator]}>{strings('importWallet.import_from_seed_help')}</Text>

					<View style={styles.ctaWrapper}>
						<StyledButton
							type={'normal'}
							onPress={this.onPressImport}
							testID={'onboarding-new-button'}
							containerStyle={styles.importFromSeedBtn}
						>
							{strings('importWallet.import_from_seed_button')}
						</StyledButton>
					</View>
				</ScrollView>
			</Screen>
		);
	}
}
