import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { InteractionManager, Text, View, ScrollView, StyleSheet, AsyncStorage } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import OnboardingScreenWithBg from '../OnboardingScreenWithBg';
import { strings } from '../../../locales/i18n';
import Engine from '../../core/Engine';
import SecureKeychain from '../../core/SecureKeychain';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	wrapper: {
		paddingTop: 10,
		paddingHorizontal: 40,
		paddingBottom: 30,
		flex: 1
	},
	content: {
		flex: 1,
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 19,
		marginBottom: 20,
		color: colors.copy,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.normal
	}
});

/**
 * View that is displayed to first time (new) users
 */
export default class CreateWallet extends Component {
	static navigationOptions = () => ({
		headerStyle: {
			shadowColor: 'transparent',
			elevation: 0,
			backgroundColor: 'white',
			borderBottomWidth: 0
		},
		headerLeft: null,
		headerRight: null,
		headerTitle: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	componentDidMount() {
		InteractionManager.runAfterInteractions(async () => {
			const { KeyringController } = Engine.context;

			await KeyringController.createNewVaultAndKeychain('');
			await SecureKeychain.setGenericPassword('metamask-user', '');
			await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			this.props.navigation.navigate('HomeNav');
		});
	}

	render() {
		return (
			<OnboardingScreenWithBg>
				<ScrollView style={styles.flex} contentContainerStyle={styles.flex} testID={'onboarding-screen'}>
					<View style={styles.wrapper}>
						<View style={styles.content}>
							<Text style={styles.title}>{strings('create_wallet.title')}</Text>
							<Text style={styles.subtitle}>{strings('create_wallet.subtitle')}</Text>
						</View>
					</View>
				</ScrollView>
			</OnboardingScreenWithBg>
		);
	}
}
