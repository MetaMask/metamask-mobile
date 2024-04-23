import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, StyleSheet, Text, View } from 'react-native';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import Coachmark from '../Coachmark';

import onboardingStyles from './../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_SECOND_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
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

const Step2 = ({ setOnboardingWizardStep, coachmarkRef, onClose }) => {
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();

  const [coachmarkTop, setCoachmarkTop] = useState(0);

  const handleLayout = useCallback(() => {
    const yourAccRef = coachmarkRef.yourAccountRef?.current;
    if (!yourAccRef) return;

    yourAccRef.measure(
      (
        accActionsFx,
        accActionsFy,
        accActionsWidth,
        accActionsHeight,
        accActionsPageX,
        accActionsPageY,
      ) => {
        const top = accActionsHeight + accActionsPageY;
        setCoachmarkTop(top);
      },
    );
  }, [coachmarkRef.yourAccountRef]);

  useEffect(() => {
    handleLayout();
  }, [handleLayout]);

  const onNext = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(3);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 2,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[2],
    });
  };

  const onBack = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(1);
    trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 2,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[2],
    });
  };

  const getOnboardingStyles = () => onboardingStyles(colors);

  const onCloseStep = () => {
    onClose && onClose(false);
  };

  const content = () => {
    const dynamicOnboardingStyles = getOnboardingStyles();

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text
          style={dynamicOnboardingStyles.content}
          {...generateTestId(
            Platform,
            ONBOARDING_WIZARD_SECOND_STEP_CONTENT_ID,
          )}
        >
          {strings('onboarding_wizard_new.step2.content1')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.main}>
      <View
        style={[
          styles.coachmarkContainer,
          {
            top: coachmarkTop,
          },
        ]}
      >
        <Coachmark
          title={strings('onboarding_wizard_new.step2.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          topIndicatorPosition={'topCenter'}
          currentStep={1}
          onClose={onCloseStep}
        />
      </View>
    </View>
  );
};

Step2.propTypes = {
  setOnboardingWizardStep: PropTypes.func,
  coachmarkRef: PropTypes.object,
  onClose: PropTypes.func,
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(null, mapDispatchToProps)(Step2);
