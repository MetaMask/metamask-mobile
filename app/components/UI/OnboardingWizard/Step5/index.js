import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
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
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';

const WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: importedColors.transparent,
    marginLeft: 16,
  },
  some: {
    width: WIDTH - 32,
  },
  coachmarkContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

const Step5 = (props) => {
  const { navigation, setOnboardingWizardStep, onClose } = props;

  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);
  const [coachmarkBottom, setCoachmarkBottom] = useState();

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
   * Calls props 'onClose'
   */
  const handleOnClose = () => {
    onClose && onClose(false);
  };

  /**
   * Returns content for this step
   */
  const content = () => (
    <View style={dynamicOnboardingStyles.contentContainer}>
      <Text
        style={dynamicOnboardingStyles.content}
        {...generateTestId(Platform, ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID)}
      >
        {strings('onboarding_wizard_new.step5.content1')}
      </Text>
    </View>
  );

  const getCoachmarkPosition = useCallback(() => {
    props?.coachmarkRef?.current?.measure(
      (x, y, width, heigh, pageX, pageY) => {
        setCoachmarkBottom(Dimensions.get('window').height - pageY);
      },
    );
  }, [props?.coachmarkRef]);

  useEffect(() => {
    getCoachmarkPosition();
  }, [getCoachmarkPosition]);

  return (
    <View style={styles.main}>
      <View style={[styles.coachmarkContainer, { bottom: coachmarkBottom }]}>
        <Coachmark
          title={strings('onboarding_wizard_new.step5.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          style={styles.some}
          currentStep={4}
          topIndicatorPosition={false}
          bottomIndicatorPosition={'bottomRight'}
          onClose={handleOnClose}
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
   * Callback called when closing step
   */
  onClose: PropTypes.func,
  /**
   *  ref
   */
  coachmarkRef: PropTypes.object,
};

export default connect(null, mapDispatchToProps)(Step5);
