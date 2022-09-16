import React, { PureComponent } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Alert,
  InteractionManager,
} from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles } from '../../../styles/common';
import Entypo from 'react-native-vector-icons/Entypo';
import { getOptinMetricsNavbarOptions } from '../Navbar';
import { strings } from '../../../../locales/i18n';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import StyledButton from '../StyledButton';
import Analytics from '../../../core/Analytics/Analytics';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import {
  ONBOARDING_WIZARD,
  METRICS_OPT_IN,
  DENIED,
  AGREED,
} from '../../../constants/storage';
import AppConstants from '../../../core/AppConstants';
import AnalyticsV2 from '../../../util/analyticsV2';
import DefaultPreference from 'react-native-default-preference';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
    },
    checkIcon: {
      color: colors.success.default,
    },
    crossIcon: {
      color: colors.error.default,
    },
    icon: {
      marginRight: 5,
    },
    action: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 10,
      alignItems: 'center',
    },
    title: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 22,
    },
    description: {
      ...fontStyles.normal,
      color: colors.text.default,
      flex: 1,
    },
    content: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
      paddingVertical: 10,
    },
    wrapper: {
      marginHorizontal: 20,
    },
    privacyPolicy: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.muted,
      marginTop: 10,
    },
    link: {
      textDecorationLine: 'underline',
    },
    actionContainer: {
      marginTop: 10,
      flex: 0,
      flexDirection: 'row',
      padding: 16,
      bottom: 0,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
  });

/**
 * View that is displayed in the flow to agree to metrics
 */
class OptinMetrics extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push and pop other views
    */
    navigation: PropTypes.object,
    /**
     * Action to set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
    /**
     * Onboarding events array created in previous onboarding views
     */
    events: PropTypes.array,
    /**
     * Action to erase any event stored in onboarding state
     */
    clearOnboardingEvents: PropTypes.func,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  actionsList = [1, 2, 3, 4, 5, 6].map((value) => ({
    action: value <= 3 ? 0 : 1,
    description: strings(`privacy_policy.action_description_${value}`),
  }));

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(getOptinMetricsNavbarOptions(colors));
  };

  componentDidMount() {
    this.updateNavBar();
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  /**
   * Temporary disabling the back button so users can't go back
   */
  handleBackPress = () => {
    Alert.alert(
      strings('onboarding.optin_back_title'),
      strings('onboarding.optin_back_desc'),
    );
  };

  /**
   * Action to be triggered when pressing any button
   */
  continue = async () => {
    const onContinue = this.props.route?.params?.onContinue;
    if (onContinue) {
      return onContinue();
    }

    // Get onboarding wizard state
    const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
    if (onboardingWizard) {
      this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
    } else {
      this.props.setOnboardingWizardStep(1);
      this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
    }
  };

  /**
   * Render each action with corresponding icon
   *
   * @param {object} - Object containing action and description to be rendered
   * @param {number} i - Index key
   */
  renderAction = ({ action, description }, i) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.action} key={i}>
        {action === 0 ? (
          <Entypo
            name="check"
            size={20}
            style={[styles.icon, styles.checkIcon]}
          />
        ) : (
          <Entypo
            name="cross"
            size={24}
            style={[styles.icon, styles.crossIcon]}
          />
        )}
        <Text style={styles.description}>{description}</Text>
      </View>
    );
  };

  /**
   * Track the event of opt in or opt out.
   * @param AnalyticsOptionSelected - User selected option regarding the tracking of events
   */
  trackOptInEvent = (AnalyticsOptionSelected) => {
    InteractionManager.runAfterInteractions(async () => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.ANALYTICS_PREFERENCE_SELECTED,
        {
          analytics_option_selected: AnalyticsOptionSelected,
          updated_after_onboarding: false,
        },
      );
    });
  };

  /**
   * Callback on press cancel
   */
  onCancel = async () => {
    const { events } = this.props;
    const metricsOptionSelected = 'Metrics Opt Out';
    setTimeout(async () => {
      if (events && events.length) {
        events.forEach((eventArgs) => AnalyticsV2.trackEvent(...eventArgs));
      }
      this.trackOptInEvent(metricsOptionSelected);
      this.props.clearOnboardingEvents();
      await DefaultPreference.set(METRICS_OPT_IN, DENIED);
      Analytics.disableInstance();
    }, 200);
    this.continue();
  };

  /**
   * Callback on press confirm
   */
  onConfirm = async () => {
    const { events } = this.props;
    const metricsOptionSelected = 'Metrics Opt In';
    Analytics.enable();
    setTimeout(async () => {
      if (events && events.length) {
        events.forEach((eventArgs) => AnalyticsV2.trackEvent(...eventArgs));
      }
      this.trackOptInEvent(metricsOptionSelected);
      this.props.clearOnboardingEvents();
      await DefaultPreference.set(METRICS_OPT_IN, AGREED);
    }, 200);
    this.continue();
  };

  /**
   * Callback on press policy
   */
  onPressPolicy = () => {
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.PRIVACY_POLICY,
        title: strings('privacy_policy.title'),
      },
    });
  };

  /**
   * Render privacy policy description
   *
   * @returns - Touchable opacity object to render with privacy policy information
   */
  renderPrivacyPolicy = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <TouchableOpacity onPress={this.onPressPolicy}>
        <Text style={styles.privacyPolicy}>
          {strings('privacy_policy.description') + ' '}
          <Text style={styles.link}>{strings('privacy_policy.here')}</Text>
          {strings('unit.point')}
        </Text>
      </TouchableOpacity>
    );
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.root} testID={'metaMetrics-OptIn'}>
        <ScrollView style={styles.root}>
          <View style={styles.wrapper}>
            <Text style={styles.title}>
              {strings('privacy_policy.description_title')}
            </Text>
            <Text style={styles.content}>
              {strings('privacy_policy.description_content_1')}
            </Text>
            <Text style={styles.content}>
              {strings('privacy_policy.description_content_2')}
            </Text>
            {this.actionsList.map((action, i) => this.renderAction(action, i))}
            {this.renderPrivacyPolicy()}
          </View>

          <View style={styles.actionContainer}>
            <StyledButton
              containerStyle={[styles.button, styles.cancel]}
              type={'cancel'}
              onPress={this.onCancel}
              testID={'cancel-button'}
            >
              {strings('privacy_policy.decline')}
            </StyledButton>
            <StyledButton
              containerStyle={[styles.button, styles.confirm]}
              type={'confirm'}
              onPress={this.onConfirm}
              testID={'agree-button'}
            >
              {strings('privacy_policy.agree')}
            </StyledButton>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

OptinMetrics.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  events: state.onboarding.events,
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  clearOnboardingEvents: () => dispatch(clearOnboardingEvents()),
});

export default connect(mapStateToProps, mapDispatchToProps)(OptinMetrics);
