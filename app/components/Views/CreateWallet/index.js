import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Platform,
	Image,
	ActivityIndicator,
	InteractionManager,
	Text,
	View,
	ScrollView,
	StyleSheet,
	BackHandler
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import AnimatedFox from 'react-native-animated-fox';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import { passwordUnset, seedphraseNotBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import { connect } from 'react-redux';
import setOnboardingWizardStep from '../../../actions/wizard';
import { NavigationActions, withNavigationFocus } from 'react-navigation';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingHorizontal: 40,
		paddingBottom: 30,
		alignItems: 'center',
		flex: 1
	},
	title: {
		fontSize: 22,
		marginTop: 30,
		marginBottom: 10,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		width: 295,
		fontSize: 16,
		lineHeight: 23,
		marginBottom: 20,
		color: colors.grey500,
		textAlign: 'center',
		...fontStyles.normal
	},
	foxWrapper: {
		width: Platform.OS === 'ios' ? 90 : 80,
		height: Platform.OS === 'ios' ? 90 : 80,
		marginTop: 30,
		marginBottom: 30
	},
	image: {
		alignSelf: 'center',
		width: 80,
		height: 80
	}
});

/**
 * View that is displayed to first time (new) users
 * while their wallet is created
 */
class CreateWallet extends PureComponent {
	static navigationOptions = () => ({
		header: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Action to reset the flag passwordSet in redux
		 */
		passwordUnset: PropTypes.func,
		/**
		 * Action to set the locktime in redux
		 */
		setLockTime: PropTypes.func,
		/**
		 * Action to reset the flag seedphraseBackedUp in redux
		 */
		seedphraseNotBackedUp: PropTypes.func,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * React navigation prop to know if this view is focused
		 */
		isFocused: PropTypes.bool
	};

	// Temporary disabling the back button so users can't go back
	// while creating the wallet
	handleBackPress = () => {
		if (this.props.isFocused) {
			return true;
		}
	};

	componentDidMount() {
		BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);

		InteractionManager.runAfterInteractions(async () => {
			const { KeyringController } = Engine.context;

			await KeyringController.createNewVaultAndKeychain('');
			await SecureKeychain.setGenericPassword('metamask-user', '');
			await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			// Get onboarding wizard state
			const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
			// Check if user passed through metrics opt-in screen
			const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
			// Making sure we reset the flag while going to
			// the first time flow
			this.props.passwordUnset();
			this.props.setLockTime(-1);
			this.props.seedphraseNotBackedUp();
			setTimeout(() => {
				if (!metricsOptIn) {
					this.props.navigation.navigate('OptinMetrics');
				} else if (onboardingWizard) {
					this.props.navigation.navigate('HomeNav');
				} else {
					this.props.setOnboardingWizardStep(1);
					this.props.navigation.navigate(
						'HomeNav',
						{},
						NavigationActions.navigate({ routeName: 'WalletView' })
					);
				}
			}, 1000);
		});
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
	}

	render() {
		return (
			<View style={baseStyles.flexGrow} testID={'create-wallet-screen'}>
				<OnboardingScreenWithBg screen={'d'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.wrapper}>
							<View style={styles.foxWrapper}>
								{Platform.OS === 'android' ? (
									<Image
										source={require('../../../images/fox.png')}
										style={styles.image}
										resizeMethod={'auto'}
									/>
								) : (
									<AnimatedFox />
								)}
							</View>
							<ActivityIndicator
								size="large"
								color={Platform.OS === 'android' ? colors.blue : colors.grey}
							/>
							<Text style={styles.title}>{strings('create_wallet.title')}</Text>
							<Text style={styles.subtitle}>{strings('create_wallet.subtitle')}</Text>
						</View>
					</ScrollView>
				</OnboardingScreenWithBg>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setLockTime: time => dispatch(setLockTime(time)),
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step)),
	passwordUnset: () => dispatch(passwordUnset()),
	seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp())
});

export default connect(
	null,
	mapDispatchToProps
)(withNavigationFocus(CreateWallet));
