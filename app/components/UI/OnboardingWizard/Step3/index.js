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
import { ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectAccounts } from '../../../../selectors/accountTrackerController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../../selectors/preferencesController';

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  coachmarkContainer: {
    position: 'absolute',
  },
});

const Step3 = ({ setOnboardingWizardStep, coachmarkRef, onClose }) => {
  const { colors } = useTheme();
  const [coachmarkTop, setCoachmarkTop] = useState(0);
  const [coachmarkLeft, setCoachmarkLeft] = useState(0);
  const [coachmarkRight, setCoachmarkRight] = useState(0);

  const handleLayout = useCallback(() => {
    const accActionsRef = coachmarkRef.accountActionsRef?.current;
    if (!accActionsRef) return;

    accActionsRef.measure(
      (
        accActionsFx,
        accActionsFy,
        accActionsWidth,
        accActionsHeight,
        accActionsPageX,
        accActionsPageY,
      ) => {
        const top = accActionsHeight + accActionsPageY;
        const right =
          Dimensions.get('window').width - (accActionsPageX + accActionsWidth);
        setCoachmarkTop(top);
        setCoachmarkLeft(accActionsPageX);
        setCoachmarkRight(right);
      },
    );
  }, [coachmarkRef.accountActionsRef]);

  useEffect(() => {
    handleLayout();
  }, [handleLayout]);

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
          {strings('onboarding_wizard_new.step3.content1')}
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
            left: coachmarkLeft,
            right: coachmarkRight,
          },
        ]}
      >
        <Coachmark
          title={strings('onboarding_wizard_new.step3.title')}
          content={content()}
          onNext={onNext}
          onBack={onBack}
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
  accounts: selectAccounts(state),
  currentCurrency: selectCurrentCurrency(state),
  selectedAddress: selectSelectedAddress(state),
  identities: selectIdentities(state),
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Step3);
