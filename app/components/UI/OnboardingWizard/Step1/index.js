import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, InteractionManager } from 'react-native';
import Coachmark from '../Coachmark';
import Device from '../../../../util/Device';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import ANALYTICS_EVENT_OPTS from '../../../../util/analytics';
import Analytics from '../../../../core/Analytics';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	coachmark: {
		marginHorizontal: 16
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: Device.isIphoneX() ? 36 : Device.isIos() ? 16 : 36
	}
});

class Step1 extends PureComponent {
	static propTypes = {
		/**
		 * Callback called when closing step
		 */
		onClose: PropTypes.func,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 */
	onNext = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(2);
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_TAKE_THE_TOUR);
		});
	};

	/**
	 * Calls props 'onClose'
	 */
	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose(false);
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_NO_THANKS);
		});
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content}>{strings('onboarding_wizard.step1.content1')}</Text>
			<Text style={onboardingStyles.content}>{strings('onboarding_wizard.step1.content2')}</Text>
		</View>
	);

	render() {
		return (
			<View style={styles.main} testID={'onboarding-wizard-step1-view'}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={strings('onboarding_wizard.step1.title')}
						content={this.content()}
						onNext={this.onNext}
						onBack={this.onClose}
						coachmarkStyle={styles.coachmark}
						action
					/>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	null,
	mapDispatchToProps
)(Step1);
