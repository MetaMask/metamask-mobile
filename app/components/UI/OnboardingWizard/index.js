import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { colors as importedColors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import setOnboardingWizardStep from '../../../actions/wizard';
import { strings } from '../../../../locales/i18n';
import DefaultPreference from 'react-native-default-preference';
import ElevatedView from 'react-native-elevated-view';
import Modal from 'react-native-modal';
import Device from '../../../util/device';
import { ONBOARDING_WIZARD_STEP_DESCRIPTION } from '../../../util/analytics';
import { ONBOARDING_WIZARD, EXPLORED } from '../../../constants/storage';
import AnalyticsV2 from '../../../util/analyticsV2';
import { DrawerContext } from '../../../components/Nav/Main/MainNavigator';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';

const MIN_HEIGHT = Dimensions.get('window').height;
const createStyles = (colors) =>
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
      bottom: Device.isIos() ? 30 : 35,
    },
    largeSkipWrapper: {
      alignItems: 'center',
      alignSelf: 'center',
      bottom: Device.isIos() && Device.isIphoneX() ? 98 : 66,
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
    androidElevated: {
      width: 120,
      borderRadius: 30,
    },
    iosTouchable: {
      width: 120,
    },
    skipText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.primary.default,
    },
  });

const OnboardingWizard = (props) => {
  const {
    setOnboardingWizardStep,
    navigation,
    wizard: { step },
    coachmarkRef,
  } = props;
  const { drawerRef } = useContext(DrawerContext);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  /**
   * Close onboarding wizard setting step to 0 and closing drawer
   */
  const closeOnboardingWizard = async () => {
    await DefaultPreference.set(ONBOARDING_WIZARD, EXPLORED);
    setOnboardingWizardStep && setOnboardingWizardStep(0);
    drawerRef?.current?.dismissDrawer?.();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_SKIPPED,
        {
          tutorial_step_count: step,
          tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[step],
        },
      );
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_COMPLETED,
      );
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
      5: (
        <Step5
          coachmarkRef={coachmarkRef}
          drawerRef={drawerRef}
          navigation={navigation}
        />
      ),
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

  return (
    <Modal
      animationIn={{ from: { opacity: 1 }, to: { opacity: 1 } }}
      animationOut={{ from: { opacity: 0 }, to: { opacity: 0 } }}
      isVisible
      backdropOpacity={0}
      disableAnimation
      transparent
      onBackButtonPress={getBackButtonBehavior}
      style={[styles.root, Device.isAndroid() ? { minHeight: MIN_HEIGHT } : {}]}
    >
      <View style={styles.main}>{onboardingWizardNavigator(step)}</View>
      {step !== 1 && (
        <ElevatedView
          elevation={10}
          style={[
            Device.isSmallDevice()
              ? styles.smallSkipWrapper
              : styles.largeSkipWrapper,
            styles.skipButtonContainer,
          ]}
        >
          <TouchableOpacity
            style={[styles.skipButtonContainer, styles.skipButton]}
            onPress={closeOnboardingWizard}
          >
            <Text style={styles.skipText}>
              {strings('onboarding_wizard.skip_tutorial')}
            </Text>
          </TouchableOpacity>
        </ElevatedView>
      )}
    </Modal>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

const mapStateToProps = (state) => ({
  wizard: state.wizard,
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
};

export default connect(mapStateToProps, mapDispatchToProps)(OnboardingWizard);
