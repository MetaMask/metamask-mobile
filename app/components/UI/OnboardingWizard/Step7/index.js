import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import Device from '../../../../util/device';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import Routes from '../../../../constants/navigation/Routes';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_SEVENTH_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
import { useMetrics } from '../../../hooks/useMetrics';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 16,
  },
});

const Step7 = (props) => {
  const { setOnboardingWizardStep, onClose, navigation } = props;
  const { trackEvent } = useMetrics();

  const [ready, setReady] = useState(false);
  const [coachmarkTop, setCoachmarkTop] = useState(0);
  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * If component ref defined, calculate its position and position coachmark accordingly
   */
  const getPosition = () => {
    const position = Device.isAndroid() ? 280 : Device.isIphoneX() ? 320 : 280;
    setCoachmarkTop(position);
    setReady(true);
  };

  useEffect(() => {
    // As we're changing the view on this step, we have to make sure Browser is rendered
    setTimeout(() => {
      getPosition();
    }, 1200);
  }, []);

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  const onBack = () => {
    navigation?.navigate?.(Routes.WALLET.HOME);
    setOnboardingWizardStep && setOnboardingWizardStep(6);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 7,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[7],
    });
  };

  /**
   * Calls props onClose
   */
  const triggerOnClose = () => {
    onClose && onClose(false);
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text
        style={dynamicOnboardingStyles.content}
        {...generateTestId(Platform, ONBOARDING_WIZARD_SEVENTH_STEP_CONTENT_ID)}
      >
        {strings('onboarding_wizard_new.step7.content1')}
      </Text>
    </View>
  );

  if (!ready) return null;

  return (
    <View style={styles.main}>
      <View style={[styles.coachmarkContainer, { top: coachmarkTop }]}>
        <Coachmark
          title={strings('onboarding_wizard_new.step7.title')}
          content={content()}
          onNext={triggerOnClose}
          onBack={onBack}
          topIndicatorPosition={'topCenter'}
          onClose={onClose}
          currentStep={6}
        />
      </View>
    </View>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step7.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
  /**
   * Dispatch set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Callback to call when closing
   */
  onClose: PropTypes.func,
};

export default connect(null, mapDispatchToProps)(Step7);
