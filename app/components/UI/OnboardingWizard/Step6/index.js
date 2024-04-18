import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Device from '../../../../util/device';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_SIXTH_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
import { useMetrics } from '../../../hooks/useMetrics';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    marginHorizontal: 16,
    bottom: Device.isIphoneX() ? 80 : Device.isIos() ? 40 : 64,
  },
});

const Step6 = (props) => {
  const { setOnboardingWizardStep, onClose, navigation } = props;
  const { trackEvent } = useMetrics();
  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onNext = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(7);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 5,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[6],
    });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onBack = () => {
    navigation?.navigate?.(Routes.WALLET.HOME);
    setTimeout(() => {
      setOnboardingWizardStep && setOnboardingWizardStep(5);
    }, 1);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 6,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[6],
    });
  };

  /**
   * Calls props 'onClose'
   */
  const handleOnClose = () => {
    onClose && onClose(false);
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text
        style={dynamicOnboardingStyles.content}
        {...generateTestId(Platform, ONBOARDING_WIZARD_SIXTH_STEP_CONTENT_ID)}
      >
        {strings('onboarding_wizard_new.step6.content1')}
      </Text>
    </View>
  );

  return (
    <View style={styles.main}>
      <View style={styles.coachmarkContainer}>
        <Coachmark
          title={strings('onboarding_wizard_new.step6.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          currentStep={5}
          topIndicatorPosition={false}
          bottomIndicatorPosition={'bottomRight'}
          onClose={handleOnClose}
        />
      </View>
    </View>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step6.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
  /**
   * Dispatch set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Callback called when closing step
   */
  onClose: PropTypes.func,
};

export default connect(null, mapDispatchToProps)(Step6);
