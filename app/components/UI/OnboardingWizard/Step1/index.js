import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import Device from '../../../../util/device';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';

import { ThemeContext, mockTheme } from '../../../../util/theme';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/OnboardingWizardModal.selectors';
import { withMetricsAwareness } from '../../../../components/hooks/useMetrics';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmark: {
    marginHorizontal: 16,
  },
  coachmarkContainer: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Device.isIphoneX() ? 80 : Device.isIos() ? 40 : 64,
  },
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
    setOnboardingWizardStep: PropTypes.func,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  onNext = () => {
    const { setOnboardingWizardStep } = this.props;
    setOnboardingWizardStep && setOnboardingWizardStep(2);

    this.props.metrics.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STARTED, {
      tutorial_step_count: 1,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[1],
    });
  };

  /**
   * Calls props 'onClose'
   */
  onClose = () => {
    const { onClose } = this.props;
    onClose && onClose(false);
  };

  /**
   * Returns content for this step
   */
  content = () => {
    const colors = this.context.colors || mockTheme.colors;
    const dynamicOnboardingStyles = onboardingStyles(colors);

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text style={dynamicOnboardingStyles.content}>
          {strings('onboarding_wizard_new.step1.content1')}
        </Text>
      </View>
    );
  };

  render() {
    return (
      <View
        style={styles.main}
        testID={OnboardingWizardModalSelectorsIDs.STEP_ONE_CONTAINER}
      >
        <View style={styles.coachmarkContainer}>
          <Coachmark
            title={strings('onboarding_wizard_new.step1.title')}
            content={this.content()}
            onNext={this.onNext}
            onBack={this.onClose}
            coachmarkStyle={styles.coachmark}
            bottomIndicatorPosition={'bottomLeftCorner'}
            action
            onClose={this.onClose}
          />
        </View>
      </View>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step1.contextType = ThemeContext;

export default connect(null, mapDispatchToProps)(withMetricsAwareness(Step1));
