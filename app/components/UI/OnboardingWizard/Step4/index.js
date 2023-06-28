import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
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
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  coachmark: { marginHorizontal: 16 },
});

const Step4 = (props) => {
  const { setOnboardingWizardStep, onClose } = props;
  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);
  const [coachmarkBottom, setCoachmarkBottom] = useState();

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

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  const onNext = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(5);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 4,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
    });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  const onBack = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(3);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 4,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[4],
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
        {...generateTestId(Platform, ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID)}
      >
        {strings('onboarding_wizard_new.step4.content1')}
      </Text>
    </View>
  );

  return (
    <View style={styles.main}>
      <View
        style={[
          styles.coachmarkContainer,
          {
            bottom: coachmarkBottom,
          },
        ]}
      >
        <Coachmark
          title={strings('onboarding_wizard_new.step4.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          style={styles.coachmark}
          bottomIndicatorPosition={'bottomCenter'}
          currentStep={3}
          onClose={handleOnClose}
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
   * Callback called when closing step
   */
  onClose: PropTypes.func,
  /**
   *  coachmark ref to get position
   */
  coachmarkRef: PropTypes.object,
};

export default connect(null, mapDispatchToProps)(Step4);
