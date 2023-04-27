import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import StepIndicator from 'react-native-step-indicator';
import { ThemeContext, mockTheme } from '../../../util/theme';

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

  render() {
    const { currentStep, steps } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const customStyles = {
      stepIndicatorSize: 20,
      currentStepIndicatorSize: 20,
      separatorStrokeWidth: strokeWidth,
      separatorFinishedColor: colors.primary.default,
      separatorUnFinishedColor: colors.text.muted,
      currentStepStrokeWidth: strokeWidth,
      stepStrokeCurrentColor: colors.primary.default,
      stepStrokeWidth: strokeWidth,
      stepStrokeFinishedColor: colors.primary.default,
      stepStrokeUnFinishedColor: colors.text.muted,
      stepIndicatorFinishedColor: colors.primary.default,
      stepIndicatorUnFinishedColor: colors.background.default,
      stepIndicatorCurrentColor: colors.background.default,
      stepIndicatorLabelFontSize: 9,
      currentStepIndicatorLabelFontSize: 9,
      stepIndicatorLabelCurrentColor: colors.text.default,
      stepIndicatorLabelFinishedColor: colors.primary.inverse,
      stepIndicatorLabelUnFinishedColor: colors.text.muted,
      labelColor: colors.text.muted,
      stepIndicatorLabelFontFamily: fontStyles.normal.fontFamily,
      labelFontFamily: fontStyles.normal.fontFamily,
      labelSize: 10,
      currentStepLabelColor: colors.primary.default,
      finishedStepLabelColor: colors.primary.default,
    };

    return (
      <StepIndicator
        customStyles={customStyles}
        currentPosition={currentStep}
        labels={steps}
        stepCount={steps.length}
      />
    );
  }
}

OnboardingProgress.contextType = ThemeContext;
