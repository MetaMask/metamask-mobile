import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Platform, Text, View, ScrollView, StyleSheet, Image, Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import StyledButton from '../../UI/StyledButton';
import AnimatedFox from 'react-native-animated-fox';
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
		paddingTop: 60,
		paddingHorizontal: 40,
		paddingBottom: 30,
		flex: 1
	},
	content: {
		flex: 1,
		alignItems: 'flex-start'
	},
	termsAndConditions: {
		paddingTop: 30
	},
	foxWrapper: {
		width: Platform.OS === 'ios' ? 90 : 45,
		height: Platform.OS === 'ios' ? 90 : 45,
		marginTop: 30,
		marginBottom: 0
	},
	image: {
		alignSelf: 'center',
		width: Platform.OS === 'ios' ? 90 : 60,
		height: Platform.OS === 'ios' ? 90 : 60
	},
	title: {
		fontSize: 28,
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
		color: colors.grey500,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.normal
	},
	ctas: {
		flex: 1,
		flexDirection: 'column',
		marginBottom: 40
	},
	ctaWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
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
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 8,
		color: colors.fontSecondary
	},
	importWrapper: {
		marginTop: 24
	}
});

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
						<View style={styles.wrapper}>
							<View style={styles.content}>
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
								<Text style={styles.title}>{strings('onboarding.title')}</Text>
								<Text style={styles.subtitle}>{strings('onboarding.subtitle')}</Text>
							</View>
							<View style={styles.ctas}>
								<View style={styles.ctaWrapper}>
									<View>
										<Text style={styles.buttonDescription}>
											{strings('onboarding.new_to_metamask')}
										</Text>
										<View style={styles.flexGrow}>
											<StyledButton
												type={'blue'}
												onPress={this.onPressCreate}
												testID={'start-exploring-button'}
											>
												{strings('onboarding.start_exploring_now')}
											</StyledButton>
										</View>
									</View>
									<View style={styles.importWrapper}>
										<Text style={styles.buttonDescription}>
											{strings('onboarding.already_have_wallet')}
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
									<View style={[styles.termsAndConditions]}>
										<TermsAndConditions
											navigation={this.props.navigation}
											action={strings('onboarding.start_exploring_now')}
										/>
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
						</View>
					</ScrollView>
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
