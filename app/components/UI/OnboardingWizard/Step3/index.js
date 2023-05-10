import React, { PureComponent } from 'react';
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
import { mockTheme, ThemeContext } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID } from '../../../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';

const styles = StyleSheet.create({
  main: {
    flex: 1,
    position: 'absolute',
    left: 30,
  },
  coachmarkContainer: {
    flex: 1,
    left: 0,
    right: 0,
  },
  accountLabelContainer: {
    flex: 1,
    width: Dimensions.get('window').width,
    alignItems: 'center',
    backgroundColor: importedColors.transparent,
  },
});

class Step3 extends PureComponent {
  static propTypes = {
    /**
     * Dispatch set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
    /**
     * Coachmark ref to get position
     */
    coachmarkRef: PropTypes.object,
    /**
     * Callback called when closing step
     */
    onClose: PropTypes.func,
  };

  state = {
    coachmarkTop: 0,
    coachmarkTopReady: false,
  };

  /**
   * Sets corresponding account label
   */
  componentDidMount = () => {
    //  this.getViewPosition(this.props.coachmarkRef.scrollViewContainer);
    this.getCoachmarkPosition(this.props.coachmarkRef.accountActionsRef);
  };

  coachMarkTopPosition = (height) => {
    const screenWidth = Dimensions.get('screen').width;
    let coachmarkTop;

    if (screenWidth >= 390) {
      // iPhone 14 pro and larger
      coachmarkTop = height * 3.3;
    } else if (screenWidth >= 375) {
      // iPhone 6/7/8 Plus, iPhone X/XS/11 Pro Max, iPhone 12/13 Pro
      coachmarkTop = height * 2.8;
    } else if (screenWidth >= 320) {
      // iPhone 6/7/8, iPhone SE (1st and 2nd generation), iPhone 12/13 mini
      coachmarkTop = height * 2.4;
    } else {
      // smaller devices
      coachmarkTop = Dimensions.get('window').height - height - 16;
    }
    return coachmarkTop;
  };

  /**
   * Sets coachmark top position getting AccountOverview component ref from Wallet
   */
  getCoachmarkPosition = (ref) => {
    ref &&
      ref.current &&
      ref.current.measure((fx, fy, width, height) => {
        this.setState({
          coachmarkTop: this.coachMarkTopPosition(height),
          coachmarkTopReady: true,
        });
      });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with next step
   */
  onNext = () => {
    const { setOnboardingWizardStep } = this.props;
    setOnboardingWizardStep && setOnboardingWizardStep(4);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_COMPLETED, {
      tutorial_step_count: 3,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[3],
    });
  };

  /**
   * Dispatches 'setOnboardingWizardStep' with back step
   */
  onBack = () => {
    const { setOnboardingWizardStep } = this.props;
    setOnboardingWizardStep && setOnboardingWizardStep(2);
    AnalyticsV2.trackEvent(MetaMetricsEvents.ONBOARDING_TOUR_STEP_REVISITED, {
      tutorial_step_count: 3,
      tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[3],
    });
  };

  getOnboardingStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return onboardingStyles(colors);
  };

  /**
   * Calls props 'onClose'
   */
  onClose = () => {
    const { onClose } = this.props;
    onClose && onClose(false);
  };

  /**
   * Returns content for this step
   */
  content = () => {
    const dynamicOnboardingStyles = this.getOnboardingStyles();

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

  render() {
    const { coachmarkTopReady } = this.state;
    const dynamicOnboardingStyles = this.getOnboardingStyles();
    if (!coachmarkTopReady) return null;

    return (
      <View style={styles.main}>
        <View
          style={[
            styles.coachmarkContainer,
            {
              top: this.state.coachmarkTop,
            },
          ]}
        >
          <Coachmark
            title={strings('onboarding_wizard.step3.title')}
            content={this.content()}
            onNext={this.onNext}
            onBack={this.onBack}
            style={dynamicOnboardingStyles.coachmark}
            topIndicatorPosition={'topRightCorner'}
            currentStep={2}
            onClose={this.onClose}
          />
        </View>
      </View>
    );
  }
}

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

Step3.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(Step3);
