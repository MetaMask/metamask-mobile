import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { colors as importedColors } from '../../../styles/common';
import { connect } from 'react-redux';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import setOnboardingWizardStep from '../../../actions/wizard';
import DefaultPreference from 'react-native-default-preference';
import Modal from 'react-native-modal';
import { ONBOARDING_WIZARD, EXPLORED } from '../../../constants/storage';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { DrawerContext } from '../../../components/Nav/Main/MainNavigator';

const createStyles = () =>
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
  });

const OnboardingWizard = (props) => {
  const {
    setOnboardingWizardStep,
    navigation,
    wizard: { step },
    coachmarkRef,
    isAutomaticSecurityChecksModalOpen,
  } = props;
  const { drawerRef } = useContext(DrawerContext);
  const styles = createStyles();

  /**
   * Close onboarding wizard setting step to 0 and closing drawer
   */
  const closeOnboardingWizard = async () => {
    await DefaultPreference.set(ONBOARDING_WIZARD, EXPLORED);
    setOnboardingWizardStep && setOnboardingWizardStep(0);
    drawerRef?.current?.dismissDrawer?.();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_SKIPPED, {
        tutorial_step_count: step,
        tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[step],
      });
      AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_COMPLETED);
    });
  };

  const onboardingWizardNavigator = (step) => {
    const steps = {
      1: <Step1 onClose={closeOnboardingWizard} />,
      2: <Step2 coachmarkRef={coachmarkRef} />,
      3: <Step3 coachmarkRef={coachmarkRef} />,
      4: (
        <Step4
          coachmarkRef={coachmarkRef}
          drawerRef={drawerRef}
          navigation={navigation}
        />
      ),
      5: <Step5 drawerRef={drawerRef} navigation={navigation} />,
      6: (
        <Step6
          coachmarkRef={coachmarkRef}
          navigation={navigation}
          onClose={closeOnboardingWizard}
        />
      ),
    };
    return steps[step];
  };

  const getBackButtonBehavior = () => {
    if (step === 1) {
      return closeOnboardingWizard();
    } else if (step === 5) {
      setOnboardingWizardStep(4);
      navigation.navigate('WalletView');
      drawerRef?.current?.dismissDrawer?.();
    } else if (step === 6) {
      drawerRef?.current?.showDrawer?.();
      setOnboardingWizardStep(5);
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
      disableAnimation
      transparent
      onBackButtonPress={getBackButtonBehavior}
      style={styles.root}
    >
      <View style={styles.main}>{onboardingWizardNavigator(step)}</View>
    </Modal>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

const mapStateToProps = (state) => ({
  wizard: state.wizard,
  isAutomaticSecurityChecksModalOpen:
    state.security.isAutomaticSecurityChecksModalOpen,
});

OnboardingWizard.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
  /**
   * Wizard state
   */
  wizard: PropTypes.object,
  /**
   * Dispatch set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Coachmark ref to get position
   */
  coachmarkRef: PropTypes.object,
  /**
   * Boolean that determines if the user has selected the automatic security check option
   */
  isAutomaticSecurityChecksModalOpen: PropTypes.bool,
};

export default connect(mapStateToProps, mapDispatchToProps)(OnboardingWizard);
