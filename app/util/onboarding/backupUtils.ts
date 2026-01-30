import {
  CommonActions,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../metrics/TrackOnboarding/trackOnboarding';
import Routes from '../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import { TraceName, endTrace } from '../trace';
import { MetaMetricsEvents } from '../../core/Analytics';
import {
  ITrackingEvent,
  IMetaMetricsEvent,
} from '../../core/Analytics/MetaMetrics.types';

/**
 * Type for the track function
 */
type TrackFunction = (
  event: IMetaMetricsEvent,
  properties?: Record<string, string | boolean | number>,
) => void;

/**
 * Type for navigation object
 */
type NavigationObject = NavigationProp<ParamListBase>;

/**
 * Type for route params
 */
interface RouteParams {
  [key: string]: unknown;
}

/**
 * Creates a tracking function for onboarding events
 * @param saveOnboardingEvent - Redux action to save onboarding events
 * @returns Track function
 */
export const createTrackFunction =
  (
    saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void,
  ): TrackFunction =>
  (
    event: IMetaMetricsEvent,
    properties: Record<string, string | boolean | number> = {},
  ) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), saveOnboardingEvent);
  };

/**
 * Creates a navigation reset action for onboarding success
 * @param routeParams - Current route params to pass through
 * @returns CommonActions.reset action
 */
export const createOnboardingSuccessResetAction = (
  routeParams: RouteParams,
): ReturnType<typeof CommonActions.reset> =>
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
 * Parameters for handleSkipBackup function
 */
interface HandleSkipBackupParams {
  navigation: NavigationObject;
  routeParams: RouteParams;
  isMetricsEnabled: () => boolean;
  track: TrackFunction;
}

/**
 * Handles skip backup flow with metrics check
 * @param params - Skip parameters
 */
export const handleSkipBackup = async ({
  navigation,
  routeParams,
  isMetricsEnabled,
  track,
}: HandleSkipBackupParams): Promise<void> => {
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
 * Parameters for showSeedphraseDefinition function
 */
interface ShowSeedphraseDefinitionParams {
  navigation: NavigationObject;
  track: TrackFunction;
  location: string;
}

/**
 * Navigates to the seedphrase definition modal
 * @param params - Navigation parameters
 */
export const showSeedphraseDefinition = ({
  navigation,
  track,
  location,
}: ShowSeedphraseDefinitionParams): void => {
  track(MetaMetricsEvents.SRP_DEFINITION_CLICKED, {
    location,
  });
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SEEDPHRASE_MODAL,
  });
};
