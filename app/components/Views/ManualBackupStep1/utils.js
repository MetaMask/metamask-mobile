import { CommonActions } from '@react-navigation/native';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { TraceName, endTrace } from '../../../util/trace';
import { MetaMetricsEvents } from '../../../core/Analytics';

/**
 * Creates a tracking function for onboarding events
 * @param {Function} saveOnboardingEvent - Redux action to save onboarding events
 * @returns {Function} Track function
 */
export const createTrackFunction =
  (saveOnboardingEvent) =>
  (event, properties = {}) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), saveOnboardingEvent);
  };

/**
 * Creates a navigation reset action for onboarding success
 * @param {Object} routeParams - Current route params to pass through
 * @returns {Object} CommonActions.reset action
 */
export const createOnboardingSuccessResetAction = (routeParams) =>
  CommonActions.reset({
    index: 0,
    routes: [
      {
        name: Routes.ONBOARDING.SUCCESS_FLOW,
        params: {
          screen: Routes.ONBOARDING.SUCCESS,
          params: {
            ...routeParams,
            successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
          },
        },
      },
    ],
  });

/**
 * Handles skip backup flow with metrics check
 * @param {Object} params - Skip parameters
 * @param {Function} params.navigation - Navigation object
 * @param {Object} params.routeParams - Route params
 * @param {Function} params.isMetricsEnabled - Function to check if metrics are enabled
 * @param {Function} params.track - Tracking function
 */
export const handleSkipBackup = async ({
  navigation,
  routeParams,
  isMetricsEnabled,
  track,
}) => {
  track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CONFIRMED, {
    wallet_setup_type: 'new',
  });

  const resetAction = createOnboardingSuccessResetAction(routeParams);

  endTrace({ name: TraceName.OnboardingNewSrpCreateWallet });
  endTrace({ name: TraceName.OnboardingJourneyOverall });

  if (isMetricsEnabled()) {
    navigation.dispatch(resetAction);
  } else {
    navigation.navigate('OptinMetrics', {
      onContinue: () => {
        navigation.dispatch(resetAction);
      },
    });
  }
};

/**
 * Navigates to the seedphrase definition modal
 * @param {Object} params - Navigation parameters
 * @param {Function} params.navigation - Navigation object
 * @param {Function} params.track - Tracking function
 * @param {string} params.location - Location identifier for analytics
 */
export const showSeedphraseDefinition = ({ navigation, track, location }) => {
  track(MetaMetricsEvents.SRP_DEFINITION_CLICKED, {
    location,
  });
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SEEDPHRASE_MODAL,
  });
};

/**
 * Shows the skip account security modal
 * @param {Object} params - Modal parameters
 * @param {Function} params.navigation - Navigation object
 * @param {Function} params.onConfirm - Callback when user confirms skip
 * @param {Function} params.track - Tracking function
 */
export const showSkipAccountSecurityModal = ({
  navigation,
  onConfirm,
  track,
}) => {
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL,
    params: {
      onConfirm,
      onCancel: () => {
        track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CANCELED);
      },
    },
  });
  track(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);
};
