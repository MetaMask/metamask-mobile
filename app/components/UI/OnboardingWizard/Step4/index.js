import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import { fontStyles, colors } from '../../../../styles/common';
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
	hamburger: {
		backgroundColor: colors.transparent,
		height: 50,
		width: 50,
	},
	hamburgerContainer: {
		maxWidth: 50,
	},
});

class Step4 extends PureComponent {
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
		 * Coachmark ref to get position
		 */
		coachmarkRef: PropTypes.object,
	};

	state = {
		viewTop: 0,
	};

	componentDidMount = () => {
		this.getViewPosition(this.props.coachmarkRef.scrollViewContainer);
	};

	/**
	 * Sets coachmark top position getting AccountOverview component ref from Wallet
	 */
	getViewPosition = (ref) => {
		ref &&
			ref.current &&
			ref.current.measure((fx, fy, width, height, px, py) => {
				py &&
					this.setState({
						viewTop: py - 50,
					});
			});
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 */
	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		navigation && navigation.openDrawer();
		setOnboardingWizardStep && setOnboardingWizardStep(5);
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_COMPLETED, {
			tutorial_step_count: 4,
			tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
		});
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step
	 */
	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(3);
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_REVISITED, {
			tutorial_step_count: 4,
			tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
		});
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content} testID={'step4-title'}>
				<Text style={fontStyles.bold}>{strings('onboarding_wizard.step4.content1')} </Text>
				{strings('onboarding_wizard.step4.content2')}
			</Text>
			<Text style={onboardingStyles.content}>{strings('onboarding_wizard.step4.content3')}</Text>
		</View>
	);

	render() {
		return (
			<View style={[styles.main, { top: this.state.viewTop }]}>
				<View style={styles.coachmarkContainer}>
					<View style={styles.hamburgerContainer}>
						<TouchableWithoutFeedback
							style={styles.hamburger}
							onPress={this.onNext}
							testID={'hamburger-menu-button-wallet-fake'}
						>
							<View style={styles.hamburger} />
						</TouchableWithoutFeedback>
					</View>
					<Coachmark
						title={strings('onboarding_wizard.step4.title')}
						content={this.content()}
						onNext={this.onNext}
						onBack={this.onBack}
						style={onboardingStyles.coachmarkLeft}
						topIndicatorPosition={'topLeftCorner'}
						currentStep={3}
					/>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(null, mapDispatchToProps)(Step4);
