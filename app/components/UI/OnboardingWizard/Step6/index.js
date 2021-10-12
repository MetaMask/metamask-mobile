import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import Device from '../../../../util/device';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ONBOARDING_WIZARD_STEP_DESCRIPTION } from '../../../../util/analytics';

const styles = StyleSheet.create({
	main: {
		flex: 1,
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
	},
});

class Step6 extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Callback to call when closing
		 */
		onClose: PropTypes.func,
	};

	state = {
		ready: false,
		coachmarkTop: 0,
	};

	componentDidMount() {
		// As we're changing the view on this step, we have to make sure Browser is rendered
		setTimeout(() => {
			this.getPosition();
		}, 1200);
	}

	/**
	 * If component ref defined, calculate its position and position coachmark accordingly
	 */
	getPosition = () => {
		const position = Device.isAndroid() ? 270 : Device.isIphoneX() ? 300 : 270;
		this.setState({ coachmarkTop: position, ready: true });
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step, opening drawer
	 */
	onBack = () => {
		const { setOnboardingWizardStep, navigation } = this.props;
		navigation && navigation.openDrawer();
		setOnboardingWizardStep && setOnboardingWizardStep(5);
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_REVISITED, {
			tutorial_step_count: 6,
			tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[6],
		});
	};

	/**
	 * Calls props onClose
	 */
	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose(false);
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content} testID={'step6-title'}>
				{strings('onboarding_wizard.step6.content')}
			</Text>
		</View>
	);

	render() {
		const { ready } = this.state;
		if (!ready) return null;
		return (
			<View style={styles.main}>
				<View style={[styles.coachmarkContainer, { top: this.state.coachmarkTop }]}>
					<Coachmark
						title={strings('onboarding_wizard.step6.title')}
						content={this.content()}
						onNext={this.onClose}
						onBack={this.onBack}
						style={onboardingStyles.coachmark}
						topIndicatorPosition={'topCenter'}
						onClose={this.onClose}
						currentStep={5}
					/>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(null, mapDispatchToProps)(Step6);
