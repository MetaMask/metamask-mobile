import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from '../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
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

const Step5 = (props) => {
  const { setOnboardingWizardStep, onClose } = props;
  const { trackEvent } = useMetrics();
  const { colors } = useTheme();
  const dynamicOnboardingStyles = onboardingStyles(colors);
  const [coachmarkBottom, setCoachmarkBottom] = useState(50);

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
    setOnboardingWizardStep && setOnboardingWizardStep(6);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 5,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[5],
    });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  const onBack = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(4);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
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
          title={strings('onboarding_wizard_new.step5.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          bottomIndicatorPosition={'bottomCenter'}
          currentStep={4}
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

export default connect(null, mapDispatchToProps)(Step5);
