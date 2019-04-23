import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import DeviceSize from '../../../../util/DeviceSize';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';

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
		bottom: DeviceSize.isIphoneX() ? 36 : 16
	}
});

class Step1 extends Component {
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
	};

	/**
	 * Calls props 'onClose'
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
						title={strings('onboarding_wizard.step1.title')}
						content={strings('onboarding_wizard.step1.content')}
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
