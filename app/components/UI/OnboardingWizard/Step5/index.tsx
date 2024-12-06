import React from 'react';
import { useDispatch } from 'react-redux';
import { StyleSheet, Text, View } from 'react-native';
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

import { useMetrics } from '../../../hooks/useMetrics';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/OnboardingWizardModal.selectors';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 16,
    bottom: Device.isIphoneX() ? 80 : Device.isIos() ? 40 : 64,
  },
});

interface Step5Props {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coachmarkRef: any;
  onClose: () => Promise<void>;
}

const Step5 = ({ onClose }: Step5Props) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onNext = () => {
    dispatch(setOnboardingWizardStep?.(6));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED)
        .addProperties({
          tutorial_step_count: 5,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
        })
        .build(),
    );
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  const onBack = () => {
    dispatch(setOnboardingWizardStep?.(4));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED)
        .addProperties({
          tutorial_step_count: 5,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
        })
        .build(),
    );
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text
        style={dynamicOnboardingStyles.content}
        testID={OnboardingWizardModalSelectorsIDs.STEP_FIVE_CONTAINER}
      >
        {strings('onboarding_wizard_new.step5.content1')}
      </Text>
    </View>
  );

  return (
    <View style={styles.main}>
      <View style={[styles.coachmarkContainer]}>
        <Coachmark
          title={strings('onboarding_wizard_new.step5.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          bottomIndicatorPosition={'bottomCenter'}
          currentStep={4}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default Step5;
