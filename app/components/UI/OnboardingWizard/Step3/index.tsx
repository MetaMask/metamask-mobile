import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
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

interface Step3Props {
  coachmarkRef: any;
  onClose: (arg0: boolean) => void;
}

const Step3 = ({ coachmarkRef, onClose }: Step3Props) => {
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const dispatch = useDispatch();
  const [coachmarkTop, setCoachmarkTop] = useState(0);

  const handleLayout = useCallback(() => {
    const accActionsRef = coachmarkRef.accountActionsRef?.current;
    if (!accActionsRef) return;

    accActionsRef.measure(
      (accActionsHeight: number, accActionsPageY: number) => {
        const top = accActionsHeight + accActionsPageY;
        setCoachmarkTop(top);
      },
    );
  }, [coachmarkRef.accountActionsRef]);

  useEffect(() => {
    handleLayout();
  }, [handleLayout]);

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

  const onCloseStep = () => {
    onClose?.(false);
  };

  const content = () => {
    const dynamicOnboardingStyles = getOnboardingStyles();

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text
          style={dynamicOnboardingStyles.content}
          {...generateTestId(Platform, ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID)}
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
          onClose={onCloseStep}
        />
      </View>
    </View>
  );
};

export default Step3;
