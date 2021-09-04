import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../../../styles/common';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { DrawerActions } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import Device from '../../../../util/device';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ONBOARDING_WIZARD_STEP_DESCRIPTION } from '../../../../util/analytics';

const INDICATOR_HEIGHT = 10;
const DRAWER_WIDTH = 315;
const WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.transparent,
	},
	some: {
		marginLeft: 24,
		marginRight: WIDTH - DRAWER_WIDTH + 24,
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
	},
});

class Step5 extends PureComponent {
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
		coachmarkTop: 0,
		coachmarkBottom: 0,
	};

	componentDidMount = () => {
		setTimeout(() => {
			this.getPosition(this.props.coachmarkRef);
		}, 300);
	};

	/**
	 * If component ref defined, calculate its position and position coachmark accordingly
	 */
	getPosition = (ref) => {
		ref &&
			ref.current &&
			ref.current.measure((a, b, width, height, px, py) => {
				this.setState({ coachmarkTop: height + py - INDICATOR_HEIGHT, coachmarkBottom: py - 165 });
			});
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'BrowserView'
	 */
	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
		navigation &&
			navigation.navigate('BrowserTabHome', {
				screen: 'BrowserView',
			});
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_COMPLETED, {
			tutorial_step_count: 5,
			tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
		});
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'WalletView'
	 */
	onBack = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		navigation && navigation.navigate('WalletView');
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
		setTimeout(() => {
			setOnboardingWizardStep && setOnboardingWizardStep(4);
		}, 1);
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_REVISITED, {
			tutorial_step_count: 5,
			tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
		});
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content} testID={'step5-title'}>
				{strings('onboarding_wizard.step5.content1')}
			</Text>
		</View>
	);

	render() {
		if (this.state.coachmarkTop === 0) return null;

		return (
			<View style={styles.main}>
				<View
					style={[
						styles.coachmarkContainer,
						Device.isSmallDevice() ? { top: this.state.coachmarkBottom } : { top: this.state.coachmarkTop },
					]}
				>
					<Coachmark
						title={strings('onboarding_wizard.step5.title')}
						content={this.content()}
						onNext={this.onNext}
						onBack={this.onBack}
						style={styles.some}
						topIndicatorPosition={!Device.isSmallDevice() && 'topLeft'}
						bottomIndicatorPosition={Device.isSmallDevice() && 'bottomLeft'}
						currentStep={4}
					/>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(null, mapDispatchToProps)(Step5);
