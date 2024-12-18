import React, { useCallback, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';

import Coachmark from '../Coachmark';
import Device from '../../../../util/device';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { OnboardingWizardModalSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/OnboardingWizardModal.selectors';
import { useMetrics } from '../../../../components/hooks/useMetrics';

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
interface Step1Props {
  onClose: () => Promise<void>;
}

const Step1 = ({ onClose }: Step1Props) => {
  const theme = useContext(ThemeContext) || mockTheme;
  const dynamicOnboardingStyles = onboardingStyles(theme.colors);
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  const content = useCallback(
    () => (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text style={dynamicOnboardingStyles.content}>
          {strings('onboarding_wizard_new.step1.content1')}
        </Text>
      </View>
    ),
    [dynamicOnboardingStyles],
  );

  const onNext = useCallback(() => {
    dispatch(setOnboardingWizardStep?.(2));

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_STARTED)
        .addProperties({
          tutorial_step_count: 1,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[1],
        })
        .build(),
    );
  }, [dispatch, trackEvent, createEventBuilder]);

  return (
    <View
      style={styles.main}
      testID={OnboardingWizardModalSelectorsIDs.STEP_ONE_CONTAINER}
    >
      <View style={styles.coachmarkContainer}>
        <Coachmark
          title={strings('onboarding_wizard_new.step1.title')}
          content={content()}
          onNext={onNext}
          onBack={onClose}
          coachmarkStyle={styles.coachmark}
          bottomIndicatorPosition={'bottomLeftCorner'}
          action
          onClose={onClose}
        />
      </View>
    </View>
  );
};

export default Step1;
