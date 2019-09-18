import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, View, ScrollView, StyleSheet, Image, Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import StyledButton from '../../UI/StyledButton';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import { strings } from '../../../../locales/i18n';
import Button from 'react-native-button';
import { connect } from 'react-redux';
import SecureKeychain from '../../../core/SecureKeychain';
import Engine from '../../../core/Engine';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import TermsAndConditions from '../TermsAndConditions';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import { saveOnboardingEvent } from '../../../actions/onboarding';

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingHorizontal: 40,
		paddingBottom: 30,
		flex: 1
	},
	termsAndConditions: {
		paddingVertical: 30
	},
	title: {
		fontSize: 28,
		color: colors.fontPrimary,
		...fontStyles.bold,
		justifyContent: 'center',
		textAlign: 'center'
	},
	ctas: {
		flex: 1,
		marginTop: 30
	},
	footer: {
		marginTop: -20,
		marginBottom: 20
	},
	login: {
		fontSize: 18,
		color: colors.blue,
		...fontStyles.normal
	},
	buttonDescription: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 16,
		color: colors.fontSecondary
	},
	importWrapper: {
		marginVertical: 24
	},
	createWrapper: {
		marginVertical: 24
	},
	metamaskNameWrapper: {
		alignContent: 'center',
		alignItems: 'center'
	},
	metamaskName: {
		width: 122,
		height: 15
	}
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
	static navigationOptions = () => ({
		header: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * redux flag that indicates if the user set a password
		 */
		passwordSet: PropTypes.bool,
		/**
		 * Save onboarding event to state
		 */
		saveOnboardingEvent: PropTypes.func
	};

	state = {
		existingUser: false
	};

	componentDidMount() {
		this.checkIfExistingUser();
	}

	async checkIfExistingUser() {
		const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
		if (existingUser !== null) {
			this.setState({ existingUser: true });
		}
	}

	onLogin = async () => {
		const { passwordSet } = this.props;
		if (!passwordSet) {
			const { KeyringController } = Engine.context;
			// Restore vault with empty password
			await KeyringController.submitPassword('');
			await SecureKeychain.resetGenericPassword();
			this.props.navigation.navigate('HomeNav');
		} else {
			this.props.navigation.navigate('Login');
		}
	};

	onPressCreate = () => {
		const { existingUser } = this.state;
		const action = () => {
			this.props.navigation.navigate('CreateWallet');
			InteractionManager.runAfterInteractions(async () => {
				if (Analytics.getEnabled()) {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_CREATE_NEW_WALLET);
					return;
				}
				const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
				if (!metricsOptIn) {
					this.props.saveOnboardingEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_CREATE_NEW_WALLET);
				}
			});
		};
		if (existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
	};

	onPressImport = () => {
		this.props.navigation.push('ImportWallet');
		InteractionManager.runAfterInteractions(async () => {
			if (Analytics.getEnabled()) {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WALLET);
				return;
			}
			const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
			if (!metricsOptIn) {
				this.props.saveOnboardingEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WALLET);
			}
		});
	};

	alertExistingUser = callback => {
		Alert.alert(
			strings('sync_with_extension.warning_title'),
			strings('sync_with_extension.warning_message'),
			[
				{ text: strings('sync_with_extension.warning_cancel_button'), onPress: () => false, style: 'cancel' },
				{ text: strings('sync_with_extension.warning_ok_button'), onPress: () => callback() }
			],
			{ cancelable: false }
		);
	};

	render() {
		return (
			<View style={baseStyles.flexGrow} testID={'home-screen'}>
				<OnboardingScreenWithBg screen={'b'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.metamaskNameWrapper}>
							<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
						</View>
						<View style={styles.wrapper}>
							<View style={styles.ctas}>
								<Text style={styles.title}>{'Get started!'}</Text>
								<View style={styles.importWrapper}>
									<Text style={styles.buttonDescription}>
										{
											'If you’ve already got the MetaMask extension or another wallet, sync or import it to manage your existing assets.'
										}
									</Text>
									<View style={styles.flexGrow}>
										<StyledButton
											type={'normal'}
											onPress={this.onPressImport}
											testID={'onboarding-import-button'}
										>
											{strings('onboarding.import_wallet_button')}
										</StyledButton>
									</View>
								</View>
								<View style={styles.createWrapper}>
									<Text style={styles.buttonDescription}>
										{
											'New to crypto? Set up your first wallet and start exploring decentralized apps.'
										}
									</Text>
									<View style={styles.flexGrow}>
										<StyledButton
											type={'blue'}
											onPress={this.onPressCreate}
											testID={'start-exploring-button'}
										>
											{'Create wallet'}
										</StyledButton>
									</View>
								</View>
							</View>
						</View>

						{this.state.existingUser && (
							<View style={styles.footer}>
								<Button style={styles.login} onPress={this.onLogin}>
									{strings('onboarding.login')}
								</Button>
							</View>
						)}
					</ScrollView>
					<View style={styles.termsAndConditions}>
						<TermsAndConditions navigation={this.props.navigation} />
					</View>
				</OnboardingScreenWithBg>
				<FadeOutOverlay />
			</View>
		);
	}
}

const mapStateToProps = state => ({
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	saveOnboardingEvent: event => dispatch(saveOnboardingEvent(event))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Onboarding);
