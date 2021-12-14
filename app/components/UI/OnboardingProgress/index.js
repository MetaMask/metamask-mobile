import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StepIndicator from 'react-native-step-indicator';

const strokeWidth = 2;

export default class OnboardingProgress extends PureComponent {
	static defaultProps = {
		currentStep: 0,
	};

	static propTypes = {
		/**
		 * int specifying the currently selected step
		 */
		currentStep: PropTypes.number,
		/**
		 * array of text strings representing each step
		 */
		steps: PropTypes.array.isRequired,
	};

	customStyles = {
		stepIndicatorSize: 20,
		currentStepIndicatorSize: 20,
		separatorStrokeWidth: strokeWidth,
		separatorFinishedColor: colors.primary,
		separatorUnFinishedColor: colors.grey100,
		currentStepStrokeWidth: strokeWidth,
		stepStrokeCurrentColor: colors.primary,
		stepStrokeWidth: strokeWidth,
		stepStrokeFinishedColor: colors.primary,
		stepStrokeUnFinishedColor: colors.grey100,
		stepIndicatorFinishedColor: colors.primary,
		stepIndicatorUnFinishedColor: colors.white,
		stepIndicatorCurrentColor: colors.white,
		stepIndicatorLabelFontSize: 9,
		currentStepIndicatorLabelFontSize: 9,
		stepIndicatorLabelCurrentColor: colors.primary,
		stepIndicatorLabelFinishedColor: colors.white,
		stepIndicatorLabelUnFinishedColor: colors.grey100,
		labelColor: colors.grey100,
		stepIndicatorLabelFontFamily: fontStyles.normal.fontFamily,
		labelFontFamily: fontStyles.normal.fontFamily,
		labelSize: 10,
		currentStepLabelColor: colors.primary,
		finishedStepLabelColor: colors.primary,
	};

	render() {
		const { currentStep, steps } = this.props;
		return (
			<StepIndicator
				customStyles={this.customStyles}
				currentPosition={currentStep}
				labels={steps}
				stepCount={steps.length}
			/>
		);
	}
}
