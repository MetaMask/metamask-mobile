import React, { PureComponent } from 'react';
import { View, SafeAreaView, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler, Alert } from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles, colors } from '../../../styles/common';
import AsyncStorage from '@react-native-community/async-storage';
import Entypo from 'react-native-vector-icons/Entypo';
import { getOptinMetricsNavbarOptions } from '../Navbar';
import { strings } from '../../../../locales/i18n';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import StyledButton from '../StyledButton';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import { ONBOARDING_WIZARD, METRICS_OPT_IN, DENIED, AGREED } from '../../../constants/storage';
import AppConstants from '../../../core/AppConstants';
import DefaultPreference from 'react-native-default-preference';

const styles = StyleSheet.create({
	root: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white
	},
	checkIcon: {
		color: colors.green500
	},
	crossIcon: {
		color: colors.red
	},
	icon: {
		marginRight: 5
	},
	action: {
		flex: 0,
		flexDirection: 'row',
		paddingVertical: 10,
		alignItems: 'center'
	},
	title: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 22
	},
	description: {
		...fontStyles.normal,
		color: colors.black,
		flex: 1
	},
	content: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black,
		paddingVertical: 10
	},
	wrapper: {
		marginHorizontal: 20
	},
	privacyPolicy: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey400,
		marginTop: 10
	},
	link: {
		textDecorationLine: 'underline'
	},
	actionContainer: {
		marginTop: 10,
		flex: 0,
		flexDirection: 'row',
		padding: 16,
		bottom: 0
	},
	button: {
		flex: 1
	},
	cancel: {
		marginRight: 8
	},
	confirm: {
		marginLeft: 8
	}
});

/**
 * View that is displayed in the flow to agree to metrics
 */
class OptinMetrics extends PureComponent {
	static navigationOptions = () => getOptinMetricsNavbarOptions();

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Onboarding events array created in previous onboarding views
		 */
		events: PropTypes.array,
		/**
		 * Action to erase any event stored in onboarding state
		 */
		clearOnboardingEvents: PropTypes.func
	};

	actionsList = [1, 2, 3, 4, 5, 6].map(value => ({
		action: value <= 3 ? 0 : 1,
		description: strings(`privacy_policy.action_description_${value}`)
	}));

	componentDidMount() {
		Analytics.enable();
		BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
	}

	/**
	 * Temporary disabling the back button so users can't go back
	 */
	handleBackPress = () => {
		Alert.alert(strings('onboarding.optin_back_title'), strings('onboarding.optin_back_desc'));
	};

	/**
	 * Action to be triggered when pressing any button
	 */
	continue = async () => {
		// Get onboarding wizard state
		const onboardingWizard = await AsyncStorage.getItem(ONBOARDING_WIZARD);
		if (onboardingWizard) {
			this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
		} else {
			this.props.setOnboardingWizardStep(1);
			this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
		}
	};

	/**
	 * Render each action with corresponding icon
	 *
	 * @param {object} - Object containing action and description to be rendered
	 * @param {number} i - Index key
	 */
	renderAction = ({ action, description }, i) => (
		<View style={styles.action} key={i}>
			{action === 0 ? (
				<Entypo name="check" size={20} style={[styles.icon, styles.checkIcon]} />
			) : (
				<Entypo name="cross" size={24} style={[styles.icon, styles.crossIcon]} />
			)}
			<Text style={styles.description}>{description}</Text>
		</View>
	);

	/**
	 * Callback on press cancel
	 */
	onCancel = async () => {
		setTimeout(async () => {
			if (this.props.events && this.props.events.length) {
				this.props.events.forEach(e => Analytics.trackEvent(e));
			}
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_METRICS_OPT_OUT);
			this.props.clearOnboardingEvents();
			await DefaultPreference.set(METRICS_OPT_IN, DENIED);
			Analytics.disableInstance();
		}, 200);
		this.continue();
	};

	/**
	 * Callback on press confirm
	 */
	onConfirm = async () => {
		setTimeout(async () => {
			if (this.props.events && this.props.events.length) {
				this.props.events.forEach(e => Analytics.trackEvent(e));
			}
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_METRICS_OPT_IN);
			this.props.clearOnboardingEvents();
			await DefaultPreference.set(METRICS_OPT_IN, AGREED);
		}, 200);
		this.continue();
	};

	/**
	 * Callback on press policy
	 */
	onPressPolicy = () => {
		this.props.navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: AppConstants.URLS.PRIVACY_POLICY,
				title: strings('privacy_policy.title')
			}
		});
	};

	/**
	 * Render privacy policy description
	 *
	 * @returns - Touchable opacity object to render with privacy policy information
	 */
	renderPrivacyPolicy = () => (
		<TouchableOpacity onPress={this.onPressPolicy}>
			<Text style={styles.privacyPolicy}>
				{strings('privacy_policy.description') + ' '}
				<Text style={styles.link}>{strings('privacy_policy.here')}</Text>
				{strings('unit.point')}
			</Text>
		</TouchableOpacity>
	);

	render() {
		return (
			<SafeAreaView style={styles.root} testID={'metaMetrics-OptIn'}>
				<ScrollView style={styles.root}>
					<View style={styles.wrapper}>
						<Text style={styles.title}>{strings('privacy_policy.description_title')}</Text>
						<Text style={styles.content}>{strings('privacy_policy.description_content_1')}</Text>
						<Text style={styles.content}>{strings('privacy_policy.description_content_2')}</Text>
						{this.actionsList.map((action, i) => this.renderAction(action, i))}
						{this.renderPrivacyPolicy()}
					</View>

					<View style={styles.actionContainer}>
						<StyledButton
							containerStyle={[styles.button, styles.cancel]}
							type={'cancel'}
							onPress={this.onCancel}
							testID={'cancel-button'}
						>
							{strings('privacy_policy.decline')}
						</StyledButton>
						<StyledButton
							containerStyle={[styles.button, styles.confirm]}
							type={'confirm'}
							onPress={this.onConfirm}
							testID={'agree-button'}
						>
							{strings('privacy_policy.agree')}
						</StyledButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	events: state.onboarding.events
});

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step)),
	clearOnboardingEvents: () => dispatch(clearOnboardingEvents())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(OptinMetrics);
