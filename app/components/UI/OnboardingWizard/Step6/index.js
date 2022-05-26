import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import Device from '../../../../util/device';
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
});

const Step6 = (props) => {
  const { setOnboardingWizardStep, onClose } = props;
  const [ready, setReady] = useState(false);
  const [coachmarkTop, setCoachmarkTop] = useState(0);
  const { drawerRef } = useContext(DrawerContext);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * If component ref defined, calculate its position and position coachmark accordingly
   */
  const getPosition = () => {
    const position = Device.isAndroid() ? 270 : Device.isIphoneX() ? 300 : 270;
    setCoachmarkTop(position);
    setReady(true);
  };

  useEffect(() => {
    // As we're changing the view on this step, we have to make sure Browser is rendered
    setTimeout(() => {
      getPosition();
    }, 1200);
  }, []);

  /**
   * Dispatches 'setOnboardingWizardStep' with back step, opening drawer
   */
  const onBack = () => {
    drawerRef?.current?.showDrawer?.();
    setOnboardingWizardStep && setOnboardingWizardStep(5);
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_REVISITED,
      {
        tutorial_step_count: 6,
        tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[6],
      },
    );
  };

  /**
   * Calls props onClose
   */
  const triggerOnClose = () => {
    onClose && onClose(false);
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text style={dynamicOnboardingStyles.content} testID={'step6-title'}>
        {strings('onboarding_wizard.step6.content')}
      </Text>
    </View>
  );

  if (!ready) return null;

  return (
    <View style={styles.main}>
      <View style={[styles.coachmarkContainer, { top: coachmarkTop }]}>
        <Coachmark
          title={strings('onboarding_wizard.step6.title')}
          content={content()}
          onNext={triggerOnClose}
          onBack={onBack}
          style={dynamicOnboardingStyles.coachmark}
          topIndicatorPosition={'topCenter'}
          onClose={onClose}
          currentStep={5}
        />
      </View>
    </View>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step6.propTypes = {
  /**
   * Dispatch set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Callback to call when closing
   */
  onClose: PropTypes.func,
};

export default connect(null, mapDispatchToProps)(Step6);
