import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { StyleSheet, Text, View } from 'react-native';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import Coachmark from '../Coachmark';

import Device from '../../../../util/device';

import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/OnboardingWizardModal.selectors';

import { useMetrics } from '../../../hooks/useMetrics';

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

interface Step4Props {
  onClose: () => Promise<void>;
}

const Step4 = ({ onClose }: Step4Props) => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const dispatch = useDispatch();
  const [coachmarkTop, setCoachmarkTop] = useState(0);

  const handleLayout = useCallback(() => {
    const top = Device.isIphoneX() ? 82 : Device.isIos() ? 64 : 60;
    setCoachmarkTop(top);
  }, []);

  useEffect(() => {
    handleLayout();
  }, [handleLayout]);

  const onNext = () => {
    dispatch(setOnboardingWizardStep?.(5));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED)
        .addProperties({
          tutorial_step_count: 4,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
        })
        .build(),
    );
  };

  const onBack = () => {
    dispatch(setOnboardingWizardStep?.(3));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED)
        .addProperties({
          tutorial_step_count: 4,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
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
          testID={OnboardingWizardModalSelectorsIDs.STEP_FOUR_CONTAINER}
        >
          {strings('onboarding_wizard_new.step4.content1')}
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
          title={strings('onboarding_wizard_new.step4.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          topIndicatorPosition={'topRight'}
          currentStep={3}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default Step4;
