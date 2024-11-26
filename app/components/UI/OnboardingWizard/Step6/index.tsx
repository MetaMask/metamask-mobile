import React from 'react';
import { useDispatch } from 'react-redux';
import { StyleSheet, Text, View } from 'react-native';
import Device from '../../../../util/device';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import { createBrowserNavDetails } from '../../../Views/Browser';

import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/OnboardingWizardModal.selectors';
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

interface Step6Props {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  onClose: () => Promise<void>;
}

const Step6 = ({ onClose, navigation }: Step6Props) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);
  const dispatch = useDispatch();
  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onNext = () => {
    dispatch(setOnboardingWizardStep?.(7));
    navigation?.navigate(...createBrowserNavDetails());
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED)
        .addProperties({
          tutorial_step_count: 6,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[6],
        })
        .build(),
    );
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onBack = () => {
    dispatch(setOnboardingWizardStep?.(5));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED)
        .addProperties({
          tutorial_step_count: 6,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[6],
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
        testID={OnboardingWizardModalSelectorsIDs.STEP_SIX_CONTAINER}
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
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default Step6;
