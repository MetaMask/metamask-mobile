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
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 160,
		marginHorizontal: 45
	}
});

class Step7 extends Component {
	static propTypes = {
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Callback to call when closing
		 */
		onClose: PropTypes.func
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step
	 */
	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
	};

	/**
	 * Calls props onClose
	 */
	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose();
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={strings('onboarding_wizard.step7.title')}
						content={strings('onboarding_wizard.step7.content')}
						onNext={this.onClose}
						onBack={this.onBack}
						onClose={this.onClose}
						currentStep={5}
						bottomIndicatorPosition={'bottomLeft'}
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
)(Step7);
