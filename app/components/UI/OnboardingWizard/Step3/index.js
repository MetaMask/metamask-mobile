import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import {
  colors as importedColors,
  fontStyles,
} from '../../../../styles/common';
import AccountOverview from '../../AccountOverview';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import Device from '../../../../util/device';
import {
  MetaMetricsEvents,
  ONBOARDING_WIZARD_STEP_DESCRIPTION,
} from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const styles = StyleSheet.create({
  main: {
    flex: 1,
    position: 'absolute',
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
     * String that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
    /* Identities object required to get account name
    */
    identities: PropTypes.object,
    /**
     * Map of accounts to information objects including balances
     */
    accounts: PropTypes.object,
    /**
     * Currency code of the currently-active currency
     */
    currentCurrency: PropTypes.string,
    /**
     * Dispatch set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
    /**
     * Coachmark ref to get position
     */
    coachmarkRef: PropTypes.object,
  };

  state = {
    coachmarkTop: 0,
    viewTop: 0,
    coachmarkTopReady: false,
    viewTopReady: false,
  };

  /**
   * Sets corresponding account label
   */
  componentDidMount = () => {
    this.getViewPosition(this.props.coachmarkRef.scrollViewContainer);
    this.getCoachmarkPosition(this.props.coachmarkRef.editableLabelRef);
  };

  /**
   * Sets coachmark top position getting AccountOverview component ref from Wallet
   */
  getCoachmarkPosition = (ref) => {
    ref &&
      ref.current &&
      ref.current.measure((fx, fy, width, height) => {
        this.setState({
          coachmarkTop:
            2 * height +
            // TODO: FIX Hardcoded offset to account for tab tab.
            60,
          coachmarkTopReady: true,
        });
      });
  };

  /**
   * Sets view top position getting accountOverview component ref from Wallet
   */
  getViewPosition = (ref) => {
    ref &&
      ref.current &&
      ref.current.measure((fx, fy, width, height, px, py) => {
        // Adding one for android
        const viewTop = Device.isIos() ? py : py + 1;
        this.setState({
          viewTop,
          viewTopReady: true,
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
   * Returns content for this step
   */
  content = () => {
    const dynamicOnboardingStyles = this.getOnboardingStyles();

    return (
      <View style={dynamicOnboardingStyles.contentContainer}>
        <Text style={dynamicOnboardingStyles.content} testID={'step3-title'}>
          {strings('onboarding_wizard.step3.content1')}
        </Text>
        <Text style={dynamicOnboardingStyles.content}>
          <Text style={fontStyles.bold}>
            {strings('onboarding_wizard.step3.content2')}{' '}
          </Text>
          {strings('onboarding_wizard.step3.content3')}
        </Text>
      </View>
    );
  };

  render() {
    const { selectedAddress, identities, accounts, currentCurrency } =
      this.props;
    const account = {
      address: selectedAddress,
      ...identities[selectedAddress],
      ...accounts[selectedAddress],
    };
    const { coachmarkTopReady, viewTopReady } = this.state;
    const dynamicOnboardingStyles = this.getOnboardingStyles();
    if (!coachmarkTopReady || !viewTopReady) return null;

    return (
      <View style={[styles.main, { top: this.state.viewTop }]}>
        <View style={styles.accountLabelContainer} testID={'account-label'}>
          <AccountOverview
            account={account}
            currentCurrency={currentCurrency}
            onboardingWizard
          />
        </View>
        <View
          style={[styles.coachmarkContainer, { top: -this.state.coachmarkTop }]}
        >
          <Coachmark
            title={strings('onboarding_wizard.step3.title')}
            content={this.content()}
            onNext={this.onNext}
            onBack={this.onBack}
            style={dynamicOnboardingStyles.coachmark}
            topIndicatorPosition={'topCenter'}
            currentStep={2}
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
