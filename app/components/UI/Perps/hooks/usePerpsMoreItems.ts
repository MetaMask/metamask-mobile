import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useSupportConsent } from '../../../hooks/useSupportConsent';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  FEEDBACK_CONFIG,
  LEARN_MORE_CONFIG,
  SUPPORT_CONFIG,
} from '../constants/perpsConfig';
import { PerpsHomeViewSelectorsIDs } from '../Perps.testIds';
import type { PerpsMoreItem } from '../components/PerpsMoreSection';
import { selectPerpsFeedbackEnabledFlag } from '../selectors/featureFlags';

export interface PerpsMoreItemTestIds {
  support: string;
  feedback: string;
  learnMore: string;
}

interface UsePerpsMoreItemsOptions {
  /** Analytics button location. Home keeps its existing location. */
  buttonLocation?: string;
  testIDs?: PerpsMoreItemTestIds;
}

const DEFAULT_TEST_IDS: PerpsMoreItemTestIds = {
  support: PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON,
  feedback: PerpsHomeViewSelectorsIDs.FEEDBACK_BUTTON,
  learnMore: PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON,
};

/**
 * The Contact support, feedback, and learn-more rows shared by Perps home
 * and Perps settings. Destinations match home: support consent then the
 * help-center webview, the feedback survey webview, and the perps tutorial.
 */
export function usePerpsMoreItems({
  buttonLocation = PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
  testIDs = DEFAULT_TEST_IDS,
}: UsePerpsMoreItemsOptions = {}): PerpsMoreItem[] {
  const navigation = useNavigation<AppNavigationProp>();
  const analytics = useAnalytics();
  const { openSupportWithConsent } = useSupportConsent();
  const isFeedbackEnabled = useSelector(selectPerpsFeedbackEnabledFlag);

  const navigateToContactSupport = useCallback(() => {
    openSupportWithConsent(
      (url) =>
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
            title: strings(SUPPORT_CONFIG.TitleKey),
          },
        }),
      SUPPORT_CONFIG.Url,
      () => {
        analytics.trackEvent(
          analytics
            .createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP)
            .build(),
        );
      },
    );
    analytics.trackEvent(
      analytics
        .createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.CONTACT_SUPPORT,
          [PERPS_EVENT_PROPERTY.LOCATION]: buttonLocation,
        })
        .build(),
    );
  }, [analytics, buttonLocation, navigation, openSupportWithConsent]);

  const handleGiveFeedback = useCallback(() => {
    analytics.trackEvent(
      analytics
        .createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.GIVE_FEEDBACK,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
        })
        .build(),
    );
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: FEEDBACK_CONFIG.Url,
        title: strings(FEEDBACK_CONFIG.TitleKey),
      },
    });
  }, [analytics, buttonLocation, navigation]);

  const navigateToTutorial = useCallback(() => {
    analytics.trackEvent(
      analytics
        .createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.TUTORIAL,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
        })
        .build(),
    );
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: buttonLocation,
    });
  }, [analytics, buttonLocation, navigation]);

  return useMemo(() => {
    const items: PerpsMoreItem[] = [
      {
        label: strings(SUPPORT_CONFIG.TitleKey),
        startIconName: IconName.Sms,
        onPress: () => navigateToContactSupport(),
        testID: testIDs.support,
      },
    ];

    if (isFeedbackEnabled) {
      items.push({
        label: strings(FEEDBACK_CONFIG.TitleKey),
        startIconName: IconName.Mail,
        onPress: handleGiveFeedback,
        testID: testIDs.feedback,
      });
    }

    items.push({
      label: strings(LEARN_MORE_CONFIG.TitleKey),
      startIconName: IconName.Book,
      onPress: () => navigateToTutorial(),
      testID: testIDs.learnMore,
    });

    return items;
  }, [
    handleGiveFeedback,
    isFeedbackEnabled,
    navigateToContactSupport,
    navigateToTutorial,
    testIDs.feedback,
    testIDs.learnMore,
    testIDs.support,
  ]);
}
