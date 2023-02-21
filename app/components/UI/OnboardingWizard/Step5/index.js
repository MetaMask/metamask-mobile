import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors as importedColors } from '../../../../styles/common';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { useTheme } from '../../../../util/theme';
import { createBrowserNavDetails } from '../../../Views/Browser';

const WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: importedColors.transparent,
  },
  some: {
    marginLeft: 16,
    width: WIDTH - 32,
  },
  coachmarkContainer: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
  },
  dummyBrowserButton: {
    height: 82,
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: WIDTH / 2,
  },
  fill: {
    flex: 1,
  },
});

const Step5 = (props) => {
  const { navigation, setOnboardingWizardStep } = props;
  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onNext = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(6);
    navigation && navigation.navigate(...createBrowserNavDetails());
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 5,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
    });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onBack = () => {
    navigation && navigation.navigate('WalletView');
    setTimeout(() => {
      setOnboardingWizardStep && setOnboardingWizardStep(4);
    }, 1);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 5,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
    });
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

  return (
    <View style={styles.main}>
      <View style={styles.coachmarkContainer}>
        <Coachmark
          title={strings('onboarding_wizard.step5.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          style={styles.some}
          currentStep={4}
          topIndicatorPosition={false}
          bottomIndicatorPosition={'bottomRight'}
        />
      </View>
      <View style={styles.dummyBrowserButton}>
        <TouchableWithoutFeedback
          style={styles.fill}
          onPress={onNext}
          testID={'hamburger-menu-button-wallet-fake'}
        >
          <View style={styles.fill} />
        </TouchableWithoutFeedback>
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
};

export default connect(null, mapDispatchToProps)(Step5);
