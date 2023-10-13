import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const INDICATOR_HEIGHT = 10;
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
});

class Step2 extends PureComponent {
  static propTypes = {
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
  };

  componentDidMount = () => {
    this.getPosition(this.props.coachmarkRef.mainView);
  };

  /**
   * If component ref defined, calculate its position and position coachmark accordingly
   */
  getPosition = (ref) => {
    ref &&
      ref.current &&
      ref.current.measure((fx, fy, width, height, px, py) => {
        this.setState({
          coachmarkTop:
            py +
            height -
            INDICATOR_HEIGHT -
            // TODO: FIX Hardcoded offset to account for tab tab.
            82,
        });
      });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  onNext = () => {
    const { setOnboardingWizardStep } = this.props;
    setOnboardingWizardStep && setOnboardingWizardStep(3);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 2,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[2],
    });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  onBack = () => {
    const { setOnboardingWizardStep } = this.props;
    setOnboardingWizardStep && setOnboardingWizardStep(1);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 2,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[2],
    });
  };

  getOnboardingStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return onboardingStyles(colors);
  };

  /**
   * Returns content for this step
   */
  content = () => {
    const dynamicOnboardingStyles = this.getOnboardingStyles();

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text style={dynamicOnboardingStyles.content} testID={'step2-title'}>
          {strings('onboarding_wizard.step2.content1')}
        </Text>
        <Text style={dynamicOnboardingStyles.content}>
          {strings('onboarding_wizard.step2.content2')}
        </Text>
      </View>
    );
  };

  render() {
    const dynamicOnboardingStyles = this.getOnboardingStyles();

    return (
      <View style={styles.main}>
        <View
          style={[styles.coachmarkContainer, { top: this.state.coachmarkTop }]}
        >
          <Coachmark
            title={strings('onboarding_wizard.step2.title')}
            content={this.content()}
            onNext={this.onNext}
            onBack={this.onBack}
            style={dynamicOnboardingStyles.coachmark}
            topIndicatorPosition={'topCenter'}
            currentStep={1}
          />
        </View>
      </View>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step2.contextType = ThemeContext;

export default connect(null, mapDispatchToProps)(Step2);
