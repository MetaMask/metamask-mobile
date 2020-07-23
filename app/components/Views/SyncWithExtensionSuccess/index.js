import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Animated, SafeAreaView, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../../UI/StyledButton';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import AsyncStorage from '@react-native-community/async-storage';
import setOnboardingWizardStep from '../../../actions/wizard';
// eslint-disable-next-line import/named
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import Device from '../../../util/Device';
import ConfettiCannon from 'react-native-confetti-cannon';

const ORIGIN = { x: Device.getDeviceWidth() / 2, y: 0 };

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 30,
		alignItems: 'center'
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
	textContainer: {
		flex: 1
	},
	text: {
		marginTop: 20,
		fontSize: 16,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	bold: {
		...fontStyles.bold
	},
	button: {
		marginTop: 40,
		flex: 1
	},
	check: {
		fontSize: 45
	},
	passwordTipContainer: {
		padding: 16,
		backgroundColor: colors.blue000,
		borderWidth: 1,
		borderColor: colors.blue200,
		borderRadius: 8,
		marginTop: 29
	},
	passwordTipText: {
		fontSize: 12,
		lineHeight: 17,
		color: colors.blue600
	},
	learnMoreText: {
		marginTop: 29,
		textAlign: 'center',
		fontSize: 16,
		color: colors.blue,
		...fontStyles.normal
	},
	buttonContainer: {
		flexDirection: 'row'
	},
	hitSlopLearnMore: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
});

/**
 * View that shows the success message once
 * the sync with the extension is complete
 */
class SyncWithExtensionSuccess extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	static navigationOptions = ({ navigation }) => ({
		...getOnboardingNavbarOptions(navigation),
		headerLeft: <View />
	});

	iconSpringVal = new Animated.Value(0.4);

	componentDidMount() {
		this.animateIcon();
	}

	animateIcon() {
		Animated.spring(this.iconSpringVal, {
			toValue: 1,
			friction: 2,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	}

	continue = async () => {
		// Get onboarding wizard state
		const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
		// Check if user passed through metrics opt-in screen
		const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
		if (!metricsOptIn) {
			this.props.navigation.navigate('OptinMetrics');
		} else if (onboardingWizard) {
			this.props.navigation.navigate('HomeNav');
		} else {
			this.props.setOnboardingWizardStep(1);
			this.props.navigation.navigate('HomeNav', {}, NavigationActions.navigate({ routeName: 'WalletView' }));
		}
	};

	learnMore = () => {
		this.props.navigation.navigate('Webview', {
			url: 'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-Tips',
			title: strings('drawer.metamask_support')
		});
	};

	render = () => (
		<SafeAreaView style={styles.mainWrapper}>
			<ConfettiCannon fadeOut count={300} origin={ORIGIN} />
			<ScrollView contentContainerStyle={styles.wrapper} testID={'sync-with-extension-screen'}>
				<Animated.View
					style={[
						styles.iconWrapper,
						{
							transform: [{ scale: this.iconSpringVal }]
						}
					]}
				>
					<Text style={styles.check}>✅</Text>
				</Animated.View>
				<Text style={styles.title}>{strings('sync_with_extension_success.title')}</Text>
				<View style={styles.textContainer}>
					<Text style={styles.text}>
						{strings('sync_with_extension_success.sync_complete_1')}{' '}
						<Text style={styles.bold}>{strings('sync_with_extension_success.sync_complete_2')}</Text>
					</Text>
					<TouchableOpacity onPress={this.learnMore} hitSlop={styles.hitSlopLearnMore}>
						<Text style={styles.learnMoreText}>{strings('sync_with_extension_success.learn_more')}</Text>
					</TouchableOpacity>
					<View style={styles.passwordTipContainer}>
						<Text style={styles.passwordTipText}>
							{strings('sync_with_extension_success.password_tip')}
						</Text>
					</View>
				</View>
				<View style={styles.buttonContainer}>
					<StyledButton type="blue" onPress={this.continue} containerStyle={styles.button}>
						{strings('sync_with_extension_success.button_continue')}
					</StyledButton>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	null,
	mapDispatchToProps
)(SyncWithExtensionSuccess);
