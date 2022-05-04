import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ONBOARDING_WIZARD_STEP_DESCRIPTION } from '../../../../util/analytics';
import { DrawerContext } from '../../../../components/Nav/Main/MainNavigator';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  hamburger: {
    backgroundColor: importedColors.transparent,
    height: 50,
    width: 50,
  },
  hamburgerContainer: {
    maxWidth: 50,
  },
});

const Step4 = (props) => {
  const { coachmarkRef, setOnboardingWizardStep } = props;
  const [viewTop, setViewTop] = useState(0);
  const { drawerRef } = useContext(DrawerContext);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * Sets coachmark top position getting AccountOverview component ref from Wallet
   */
  const getViewPosition = (ref) => {
    ref &&
      ref.current &&
      ref.current.measure((fx, fy, width, height, px, py) => {
        py && setViewTop(py - 50);
      });
  };

  useEffect(
    () => {
      getViewPosition(coachmarkRef.scrollViewContainer);
    },
    /* eslint-disable-next-line */
    [getViewPosition],
  );

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onNext = () => {
    drawerRef?.current?.showDrawer?.();
    setOnboardingWizardStep && setOnboardingWizardStep(5);
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_COMPLETED,
      {
        tutorial_step_count: 4,
        tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
      },
    );
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  const onBack = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(3);
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_REVISITED,
      {
        tutorial_step_count: 4,
        tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
      },
    );
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text style={dynamicOnboardingStyles.content} testID={'step4-title'}>
        <Text style={fontStyles.bold}>
          {strings('onboarding_wizard.step4.content1')}{' '}
        </Text>
        {strings('onboarding_wizard.step4.content2')}
      </Text>
      <Text style={dynamicOnboardingStyles.content}>
        {strings('onboarding_wizard.step4.content3')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.main, { top: viewTop }]}>
      <View style={styles.coachmarkContainer}>
        <View style={styles.hamburgerContainer}>
          <TouchableWithoutFeedback
            style={styles.hamburger}
            onPress={onNext}
            testID={'hamburger-menu-button-wallet-fake'}
          >
            <View style={styles.hamburger} />
          </TouchableWithoutFeedback>
        </View>
        <Coachmark
          title={strings('onboarding_wizard.step4.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          style={dynamicOnboardingStyles.coachmarkLeft}
          topIndicatorPosition={'topLeftCorner'}
          currentStep={3}
        />
      </View>
    </View>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step4.propTypes = {
  /**
   * Dispatch set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Coachmark ref to get position
   */
  coachmarkRef: PropTypes.object,
};

export default connect(null, mapDispatchToProps)(Step4);
