import React, { useContext } from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'react-native-modal';
import type { Theme } from '@metamask/design-tokens';
import { DrawerContext } from '../../../components/Nav/Main/MainNavigator';
import { colors as importedColors } from '../../../styles/common';

import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import Step7 from './Step7';
import setOnboardingWizardStep from '../../../actions/wizard';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_WIZARD, EXPLORED } from '../../../constants/storage';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';
import StorageWrapper from '../../../store/storage-wrapper';
import { isTest } from '../../../util/test/utils';
import { useMetrics } from '../../hooks/useMetrics';
import { RootState } from '../../../reducers';

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    root: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      flex: 1,
      margin: 0,
      position: 'absolute',
      backgroundColor: importedColors.transparent,
    },
    main: {
      flex: 1,
      backgroundColor: importedColors.transparent,
    },
    smallSkipWrapper: {
      alignItems: 'center',
      alignSelf: 'center',
      bottom: Device.isIos() ? 25 : 30,
    },
    largeSkipWrapper: {
      alignItems: 'center',
      alignSelf: 'center',
      bottom: Device.isIos() && Device.isIphoneX() ? 93 : 61,
    },
    skipButtonContainer: {
      height: 30,
      width: 120,
      borderRadius: 15,
      backgroundColor: colors.background.default,
    },
    skipButton: {
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      ...typography.sBodyMD,
      color: colors.primary.default,
    } as TextStyle,
  });

interface OnboardingWizardProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  coachmarkRef?: React.RefObject<unknown> | null;
}

interface DrawerRef {
  dismissDrawer: () => void;
  showDrawer: () => void;
}

const OnboardingWizard = ({
  navigation,
  coachmarkRef,
}: OnboardingWizardProps) => {
  const { drawerRef } = useContext(DrawerContext);
  const theme = useTheme();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(theme);

  const isAutomaticSecurityChecksModalOpen = useSelector(
    (state: RootState) => state.security.isAutomaticSecurityChecksModalOpen,
  );

  const { step } = useSelector((state: RootState) => state.wizard);

  /**
   * Close onboarding wizard setting step to 0 and closing drawer
   */
  const closeOnboardingWizard = async () => {
    await StorageWrapper.setItem(ONBOARDING_WIZARD, EXPLORED);
    dispatch(setOnboardingWizardStep(0));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_SKIPPED)
        .addProperties({
          tutorial_step_count: step,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[step],
        })
        .build(),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_TOUR_COMPLETED).build(),
    );
  };

  // Since react-native-default-preference is not covered by the fixtures,
  // when isTest is `true`, if the ONBOARDING_WIZARD is marked as 'explored',
  // it indicates that it was provided by fixtures, triggering the call to closeOnboardingWizard().
  if (isTest && step === 1) {
    const inTestCloseOnboardingWizard = async () => {
      const wizardStep = await StorageWrapper.getItem(ONBOARDING_WIZARD);
      if (wizardStep === EXPLORED) {
        await closeOnboardingWizard();
      }
    };
    inTestCloseOnboardingWizard();
  }

  const onboardingWizardNavigator = (s: number) => {
    const steps: Record<number, JSX.Element> = {
      1: <Step1 onClose={closeOnboardingWizard} />,
      2: <Step2 coachmarkRef={coachmarkRef} onClose={closeOnboardingWizard} />,
      3: <Step3 coachmarkRef={coachmarkRef} onClose={closeOnboardingWizard} />,
      4: <Step4 onClose={closeOnboardingWizard} />,
      5: <Step5 coachmarkRef={coachmarkRef} onClose={closeOnboardingWizard} />,
      6: <Step6 navigation={navigation} onClose={closeOnboardingWizard} />,
      7: <Step7 navigation={navigation} onClose={closeOnboardingWizard} />,
    };
    return steps[s];
  };

  const getBackButtonBehavior = () => {
    if (step === 1) {
      return closeOnboardingWizard();
    } else if (step === 6) {
      dispatch(setOnboardingWizardStep(5));
      navigation.navigate(Routes.WALLET.HOME);
      (
        drawerRef as unknown as React.RefObject<DrawerRef>
      )?.current?.dismissDrawer?.();
    } else if (step === 7) {
      (
        drawerRef as unknown as React.RefObject<DrawerRef>
      )?.current?.showDrawer?.();
      dispatch(setOnboardingWizardStep(6));
    }
    return setOnboardingWizardStep(step - 1);
  };

  if (isAutomaticSecurityChecksModalOpen) {
    return null;
  }

  return (
    <Modal
      animationIn={{ from: { opacity: 1 }, to: { opacity: 1 } }}
      animationOut={{ from: { opacity: 0 }, to: { opacity: 0 } }}
      isVisible
      backdropOpacity={0}
      onBackButtonPress={getBackButtonBehavior}
      style={styles.root}
    >
      <View style={styles.main}>{onboardingWizardNavigator(step)}</View>
    </Modal>
  );
};

export default OnboardingWizard;
