import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { colors as importedColors } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { useTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';

const styles = StyleSheet.create({
  main: {
    flex: 1,
    position: 'absolute',
  },
  coachmarkContainer: {
    flex: 1,
    right: 0,
  },
  accountLabelContainer: {
    flex: 1,
    width: Dimensions.get('window').width,
    alignItems: 'center',
    backgroundColor: importedColors.transparent,
  },
});

const Step3 = ({ setOnboardingWizardStep, coachmarkRef, onClose }) => {
  const { colors } = useTheme();
  const [coachmarkTop, setCoachmarkTop] = useState(0);
  const [coachmarkLeft, setCoachmarkLeft] = useState(0);

  const step3Ref = useRef(null);

  const handleLayout = () => {
    const accActionsRef = coachmarkRef.accountActionsRef?.current;
    const step3 = step3Ref?.current;
    if (!accActionsRef || !step3) return;

    accActionsRef.measure(
      (
        accActionsFx,
        accActionsFy,
        accActionsWidth,
        accActionsHeight,
        accActionsPageX,
        accActionsPageY,
      ) => {
        step3.measure(
          (
            coachmarkFx,
            coachmarkFy,
            coachmarkWidth,
            coachmarkHeight,
            coachmarkPageX,
            coachmarkPageY,
          ) => {
            // 20 it's the padding of the Account Actions View and the margin given to the coachmark container
            const left = accActionsWidth - coachmarkWidth + 20 + 20;

            setCoachmarkTop(accActionsHeight + accActionsPageY);
            setCoachmarkLeft(left);
          },
        );
      },
    );
  };

  const onNext = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(4);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 3,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[3],
    });
  };

  const onBack = () => {
    setOnboardingWizardStep && setOnboardingWizardStep(2);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 3,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[3],
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
          {...generateTestId(Platform, ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID)}
        >
          {strings('onboarding_wizard.step3.content1')}
        </Text>
      </View>
    );
  };

  const dynamicOnboardingStyles = getOnboardingStyles();

  return (
    <View style={styles.main} ref={step3Ref} onLayout={handleLayout}>
      <View
        style={[
          styles.coachmarkContainer,
          {
            top: coachmarkTop,
            left: coachmarkLeft,
          },
        ]}
      >
        <Coachmark
          title={strings('onboarding_wizard.step3.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
          style={dynamicOnboardingStyles.coachmark}
          topIndicatorPosition={'topRightCorner'}
          currentStep={2}
          onClose={onCloseStep}
        />
      </View>
    </View>
  );
};

Step3.propTypes = {
  setOnboardingWizardStep: PropTypes.func,
  coachmarkRef: PropTypes.object,
  onClose: PropTypes.func,
};

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  identities: state.engine.backgroundState.PreferencesController.identities,
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Step3);
