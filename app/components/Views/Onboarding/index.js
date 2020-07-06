import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, View, ScrollView, StyleSheet, InteractionManager } from 'react-native';
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
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import { getTransparentBackOnboardingNavbarOptions } from '../../UI/Navbar';
import ActionModal from '../../UI/ActionModal';

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingHorizontal: 40,
		paddingVertical: 30,
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
		flex: 1
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
	buttonWrapper: {
		flexGrow: 1,
		marginHorizontal: 50
	},
	warningModalView: {
		margin: 24
	},
	warningModalTitle: {
		...fontStyles.bold,
		color: colors.red,
		textAlign: 'center',
		fontSize: 20,
		marginBottom: 16
	},
	warningModalText: {
		...fontStyles.normal,
		color: colors.black,
		textAlign: 'center',
		fontSize: 14
	},
	warningModalTextBold: {
		...fontStyles.bold
	}
});

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransparentBackOnboardingNavbarOptions(navigation);

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
		existingUser: false,
		warningModalVisible: false
	};

	// eslint-disable-next-line no-empty-function
	warningCallback = () => {};

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

	handleExistingUser = action => {
		if (this.state.existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
	};

	onPressCreate = () => {
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
		this.handleExistingUser(action);
	};

	onPressImport = () => {
		const action = () => {
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
		this.handleExistingUser(action);
	};

	alertExistingUser = callback => {
		this.warningCallback = () => {
			callback();
			this.toggleWarningModal();
		};
		this.toggleWarningModal();
	};

	toggleWarningModal = () => {
		const warningModalVisible = this.state.warningModalVisible;
		this.setState({ warningModalVisible: !warningModalVisible });
	};

	render() {
		return (
			<View style={baseStyles.flexGrow} testID={'onboarding-screen'}>
				<OnboardingScreenWithBg screen={'c'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.wrapper}>
							<View style={styles.ctas}>
								<Text style={styles.title} testID={'onboarding-screen-title'}>
									{strings('onboarding.title')}
								</Text>
								<View style={styles.importWrapper}>
									<Text style={styles.buttonDescription}>{strings('onboarding.sync_desc')}</Text>
									<View style={styles.buttonWrapper}>
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
									<Text style={styles.buttonDescription}>{strings('onboarding.create_desc')}</Text>
									<View style={styles.buttonWrapper}>
										<StyledButton
											type={'blue'}
											onPress={this.onPressCreate}
											testID={'start-exploring-button'}
										>
											{strings('onboarding.start_exploring_now')}
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
				<ActionModal
					modalVisible={this.state.warningModalVisible}
					cancelText={strings('onboarding.warning_proceed')}
					confirmText={strings('onboarding.warning_cancel')}
					onCancelPress={this.warningCallback}
					onRequestClose={this.toggleWarningModal}
					onConfirmPress={this.toggleWarningModal}
					cancelButtonMode={'warning'}
					confirmButtonMode={'neutral'}
					verticalButtons
				>
					<View style={styles.warningModalView}>
						<Text style={styles.warningModalTitle}>{strings('onboarding.warning_title')}</Text>
						<Text style={styles.warningModalText}>
							{strings('onboarding.warning_text_1')}
							<Text style={styles.warningModalTextBold}>{` ${strings(
								'onboarding.warning_text_2'
							)} `}</Text>
							{strings('onboarding.warning_text_3')}
						</Text>
						<Text />
						<Text style={styles.warningModalText}>{strings('onboarding.warning_text_4')}</Text>
					</View>
				</ActionModal>
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
