import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	some: {
		marginHorizontal: 45
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 280
	}
});

class Step2 extends Component {
	static propTypes = {
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
		setOnboardingWizardStep && setOnboardingWizardStep(3);
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step
	 */
	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(1);
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={strings('onboarding_wizard.step2.title')}
						content={strings('onboarding_wizard.step2.content')}
						onNext={this.onNext}
						onBack={this.onBack}
						style={styles.some}
						topIndicatorPosition={'topCenter'}
						currentStep={1}
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
)(Step2);
