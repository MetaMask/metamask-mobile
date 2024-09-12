/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { StyleSheet, Text, View } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import { useMetrics } from '../../../hooks/useMetrics';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/OnboardingWizardModal.selectors';
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

interface Step3Props {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coachmarkRef: any;
  onClose: () => Promise<void>;
}

const Step3 = ({ coachmarkRef, onClose }: Step3Props) => {
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const dispatch = useDispatch();
  const { coachmarkTop } = useHandleLayout(coachmarkRef);

  const onNext = () => {
    dispatch(setOnboardingWizardStep?.(4));
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 3,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[3],
    });
  };

  const onBack = () => {
    dispatch(setOnboardingWizardStep?.(2));
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 3,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[3],
    });
  };

  const getOnboardingStyles = () => onboardingStyles(colors);

  const content = () => {
    const dynamicOnboardingStyles = getOnboardingStyles();

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text
          style={dynamicOnboardingStyles.content}
          testID={OnboardingWizardModalSelectorsIDs.STEP_THREE_CONTAINER}
        >
          {strings('onboarding_wizard_new.step3.content1')}
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
          title={strings('onboarding_wizard_new.step3.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          topIndicatorPosition={'topRightCorner'}
          currentStep={2}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default Step3;
