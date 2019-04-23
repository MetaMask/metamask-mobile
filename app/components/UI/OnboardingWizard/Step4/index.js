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
		marginLeft: 10,
		marginRight: 85
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 90
	}
});

class Step4 extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 */
	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		navigation && navigation.openDrawer();
		setOnboardingWizardStep && setOnboardingWizardStep(5);
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step
	 */
	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(3);
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={strings('onboarding_wizard.step4.title')}
						content={strings('onboarding_wizard.step4.content')}
						onNext={this.onNext}
						onBack={this.onBack}
						style={styles.some}
						topIndicatorPosition={'topLeftCorner'}
						currentStep={3}
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
)(Step4);
