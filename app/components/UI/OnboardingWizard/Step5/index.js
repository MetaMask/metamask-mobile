import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors as importedColors } from '../../../../styles/common';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import Device from '../../../../util/device';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ONBOARDING_WIZARD_STEP_DESCRIPTION } from '../../../../util/analytics';
import { DrawerContext } from '../../../../components/Nav/Main/MainNavigator';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';
import Routes from '../../../../constants/navigation/Routes';

const INDICATOR_HEIGHT = 10;
const DRAWER_WIDTH = 315;
const WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: importedColors.transparent,
  },
  some: {
    marginLeft: 24,
    marginRight: WIDTH - DRAWER_WIDTH + 24,
  },
  coachmarkContainer: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

const Step5 = (props) => {
  const { navigation, setOnboardingWizardStep, coachmarkRef } = props;
  const [coachmarkTop, setCoachmarkTop] = useState(0);
  const [coachmarkBottom, setCoachmarkBottom] = useState(0);
  const { drawerRef } = useContext(DrawerContext);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * If component ref defined, calculate its position and position coachmark accordingly
   */
  const getPosition = (ref) => {
    ref &&
      ref.current &&
      ref.current.measure((a, b, width, height, px, py) => {
        setCoachmarkTop(height + py - INDICATOR_HEIGHT);
        setCoachmarkBottom(py - 165);
      });
  };

  useEffect(
    () => {
      setTimeout(() => {
        getPosition(coachmarkRef);
      }, 300);
    },
    /* eslint-disable-next-line */
    [getPosition],
  );

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   * Closing drawer and navigating to 'BrowserView'
   */
  const onNext = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(6);
    drawerRef?.current?.dismissDrawer?.();
    navigation &&
      navigation.navigate(Routes.BROWSER_TAB_HOME, {
        screen: Routes.BROWSER_VIEW,
      });
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_COMPLETED,
      {
        tutorial_step_count: 5,
        tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
      },
    );
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   * Closing drawer and navigating to 'WalletView'
   */
  const onBack = () => {
    navigation && navigation.navigate('WalletView');
    drawerRef?.current?.dismissDrawer?.();
    setTimeout(() => {
      setOnboardingWizardStep && setOnboardingWizardStep(4);
    }, 1);
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_STEP_REVISITED,
      {
        tutorial_step_count: 5,
        tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
      },
    );
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text style={dynamicOnboardingStyles.content} testID={'step5-title'}>
        {strings('onboarding_wizard.step5.content1')}
      </Text>
    </View>
  );

  if (coachmarkTop === 0) return null;

  return (
    <View style={styles.main}>
      <View
        style={[
          styles.coachmarkContainer,
          Device.isSmallDevice()
            ? { top: coachmarkBottom }
            : { top: coachmarkTop },
        ]}
      >
        <Coachmark
          title={strings('onboarding_wizard.step5.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          style={styles.some}
          topIndicatorPosition={!Device.isSmallDevice() && 'topLeft'}
          bottomIndicatorPosition={Device.isSmallDevice() && 'bottomLeft'}
          currentStep={4}
        />
      </View>
    </View>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

Step5.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
  /**
   * Dispatch set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Coachmark ref to get position
   */
  coachmarkRef: PropTypes.object,
};

export default connect(null, mapDispatchToProps)(Step5);
