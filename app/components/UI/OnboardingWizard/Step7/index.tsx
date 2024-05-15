import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import Routes from '../../../../constants/navigation/Routes';

import Device from '../../../../util/device';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';

import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_SEVENTH_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
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

interface Step7Props {
  navigation: any;
  onClose: (arg0: boolean) => void;
}

const Step7 = ({ navigation, onClose }: Step7Props) => {
  const { trackEvent } = useMetrics();
  const dispatch = useDispatch();
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
    getPosition();
  }, []);

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  const onBack = () => {
    navigation?.navigate?.(Routes.WALLET.HOME);
    setTimeout(() => {
      dispatch(setOnboardingWizardStep?.(6));
    }, 1);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 7,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[7],
    });
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
          onNext={onClose}
          onBack={onBack}
          topIndicatorPosition={'topCenter'}
          onClose={onClose}
          currentStep={6}
        />
      </View>
    </View>
  );
};

export default Step7;
