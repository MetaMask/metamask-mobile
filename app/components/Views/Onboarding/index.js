import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, Text, View, ScrollView, StyleSheet, Image, Alert } from 'react-native';
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
	ctas: {
		justifyContent: 'flex-end',
		height: 190,
		paddingBottom: 40
	},
	foxWrapper: {
		width: Platform.OS === 'ios' ? 100 : 66,
		height: Platform.OS === 'ios' ? 100 : 66,
		marginTop: 30,
		marginBottom: 0
	},
	image: {
		alignSelf: 'center',
		width: Platform.OS === 'ios' ? 100 : 66,
		height: Platform.OS === 'ios' ? 10 : 66
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
		color: colors.copy,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.normal
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
		fontSize: 15,
		color: colors.fontSecondary,
		...fontStyles.normal
	}
});

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends Component {
	static navigationOptions = () => ({
		headerStyle: {
			shadowColor: 'transparent',
			elevation: 0,
			backgroundColor: 'white',
			borderBottomWidth: 0
		},
		headerTitle: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * redux flag that indicates if the user set a password
		 */
		passwordSet: PropTypes.bool
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
		const action = () => this.props.navigation.push('CreateWallet');
		if (existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
	};

	onPressImport = () => {
		this.props.navigation.push('ImportWallet');
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
			<View style={baseStyles.flexGrow}>
				<OnboardingScreenWithBg>
					<ScrollView style={styles.flex} contentContainerStyle={styles.flex} testID={'onboarding-screen'}>
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
									<StyledButton
										type={'blue'}
										onPress={this.onPressCreate}
										testID={'onboarding-new-button'}
									>
										{strings('onboarding.start_exploring_now')}
									</StyledButton>
								</View>
								<View style={styles.ctaWrapper}>
									<StyledButton
										type={'normal'}
										onPress={this.onPressImport}
										testID={'onboarding-import-button'}
									>
										{strings('onboarding.import_wallet_button')}
									</StyledButton>
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

export default connect(mapStateToProps)(Onboarding);
