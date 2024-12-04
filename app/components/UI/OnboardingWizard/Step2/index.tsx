/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { StyleSheet, Text, View } from 'react-native';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import Coachmark from '../Coachmark';

import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/OnboardingWizardModal.selectors';
import { useMetrics } from '../../../hooks/useMetrics';
import useHandleLayout from '../useHandleLayout';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 16,
  },
});

interface Step2Props {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coachmarkRef: any;
  onClose: () => Promise<void>;
}

const Step2 = ({ coachmarkRef, onClose }: Step2Props) => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const dispatch = useDispatch();
  const { coachmarkTop } = useHandleLayout(coachmarkRef);

  const onNext = () => {
    dispatch(setOnboardingWizardStep?.(3));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED)
        .addProperties({
          tutorial_step_count: 2,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[2],
        })
        .build(),
    );
  };

  const onBack = () => {
    dispatch(setOnboardingWizardStep?.(1));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED)
        .addProperties({
          tutorial_step_count: 2,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[2],
        })
        .build(),
    );
  };

  const getOnboardingStyles = () => onboardingStyles(colors);

  const content = () => {
    const dynamicOnboardingStyles = getOnboardingStyles();

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text
          style={dynamicOnboardingStyles.content}
          testID={OnboardingWizardModalSelectorsIDs.STEP_TWO_CONTAINER}
        >
          {strings('onboarding_wizard_new.step2.content1')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.main}>
      <View
        style={[
          styles.coachmarkContainer,
          {
            top: coachmarkTop,
          },
        ]}
      >
        <Coachmark
          title={strings('onboarding_wizard_new.step2.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          topIndicatorPosition={'topCenter'}
          currentStep={1}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default Step2;
