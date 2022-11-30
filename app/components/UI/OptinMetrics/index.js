import React, { PureComponent } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Alert,
  InteractionManager,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles } from '../../../styles/common';
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
import { ThemeContext } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_TITLE_ID,
} from '../../../../wdio/features/testIDs/Screens/OptinMetricsScreen.testIds';
import Text, {
  TextVariants,
} from '../../../component-library/components/Texts/Text';
import AvatarIcon from '../../../component-library/components/Avatars/Avatar/variants/AvatarIcon';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../component-library/components/Icon';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';

const createStyles = ({ colors, typography }) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
    },
    action: {
      flexDirection: 'row',
      marginTop: 32,
    },
    actionLabelsContainer: {
      marginLeft: 16,
      flex: 1,
    },
    actionTitle: {
      ...typography.sBodyLGMedium,
      color: colors.text.default,
    },
    actionDescription: {
      ...typography.sBodyMD,
      color: colors.text.alternative,
    },
    actionDescriptionBold: {
      ...typography.sBodyMDBold,
      color: colors.text.alternative,
    },
    title: {
      ...typography.sHeadingMD,
      color: colors.text.default,
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
      paddingTop: 10,
    },
    wrapper: {
      marginHorizontal: 20,
    },
    privacyPolicy: {
      ...typography.sBodyMD,
      color: colors.text.muted,
      marginTop: 16,
    },
    link: {
      textDecorationLine: 'underline',
    },
    actionContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    button: {
      flex: 1,
    },
    buttonDivider: {
      width: 16,
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

  openRPCSettings = () => {
    const { navigation } = this.props;
    // TODO: Need network
    navigation.navigate('NetworkSettings', {
      network: 'mainnet',
      isRPCUpdate: true,
    });
  };

  actionsList = [
    {
      icon: IconName.EyeSlashFilled,
      title: strings(`privacy_policy.action_title_1`),
      description: [{ text: strings(`privacy_policy.action_description_1`) }],
    },
    {
      icon: IconName.SecurityKeyFilled,
      title: strings(`privacy_policy.action_title_2`),
      description: [
        { text: `${strings(`privacy_policy.action_description_2a`)} ` },
        {
          text: strings(`privacy_policy.action_description_2b`),
          onPress: this.openRPCSettings,
        },
        { text: strings('unit.point') },
        {
          text: ` ${strings(`privacy_policy.action_description_2c`)}`,
          isBold: true,
        },
      ],
    },
    {
      icon: IconName.SettingFilled,
      title: strings(`privacy_policy.action_title_3`),
      description: [{ text: strings(`privacy_policy.action_description_3`) }],
    },
  ];

  getStyles = () => {
    const { colors, typography } = this.context;
    return createStyles({ colors, typography });
  };

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors;
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
  renderAction = ({ icon, title, description }, i) => {
    const styles = this.getStyles();

    return (
      <View style={styles.action} key={i}>
        <AvatarIcon size={AvatarSize.Sm} name={icon} />
        <View style={styles.actionLabelsContainer}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text>
            {description.map(({ text, isBold, onPress }, index) =>
              onPress ? (
                <ButtonLink
                  variant={TextVariants.sBodyMD}
                  key={`toast-label-${index}`}
                  onPress={onPress}
                >
                  {text}
                </ButtonLink>
              ) : (
                <Text
                  key={`toast-label-${index}`}
                  style={
                    isBold
                      ? styles.actionDescriptionBold
                      : styles.actionDescription
                  }
                >
                  {text}
                </Text>
              ),
            )}
          </Text>
        </View>
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
    const styles = this.getStyles();

    return (
      <TouchableOpacity onPress={this.onPressPolicy}>
        <Text style={styles.privacyPolicy}>
          {strings('privacy_policy.description_a') + ' '}
          <ButtonLink variant={TextVariants.sBodyMD}>
            {strings('privacy_policy.description_b')}
          </ButtonLink>
          {strings('unit.point')}
        </Text>
      </TouchableOpacity>
    );
  };

  renderActionButtons = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.actionContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          onPress={this.onCancel}
          testID={OPTIN_METRICS_NO_THANKS_BUTTON_ID}
          style={styles.button}
          label={strings('privacy_policy.dont_share_data')}
          size={ButtonSize.Lg}
        />
        <View style={styles.buttonDivider} />
        <Button
          variant={ButtonVariants.Primary}
          onPress={this.onConfirm}
          testID={OPTIN_METRICS_I_AGREE_BUTTON_ID}
          style={styles.button}
          label={strings('privacy_policy.dont_share_data')}
          size={ButtonSize.Lg}
        />
      </View>
    );
  };

  render() {
    const styles = this.getStyles();

    return (
      <SafeAreaView style={styles.root} testID={'metaMetrics-OptIn'}>
        <ScrollView style={styles.root}>
          <View style={styles.wrapper}>
            <Text
              style={styles.title}
              {...generateTestId(Platform, OPTIN_METRICS_TITLE_ID)}
            >
              {strings('privacy_policy.description_title')}
            </Text>
            <Text style={styles.content}>
              {strings('privacy_policy.description_content_1')}
            </Text>
            <Text style={styles.content}>
              {strings('privacy_policy.description_content_2')}
            </Text>
            {this.actionsList.map(this.renderAction)}
            {this.renderPrivacyPolicy()}
          </View>
        </ScrollView>
        {this.renderActionButtons()}
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
