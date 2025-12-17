import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { BrowserTab } from '../../Tokens/types';
import { isCardUrl, isCardTravelUrl, isCardTosUrl } from '../../../../util/url';
import AppConstants from '../../../../core/AppConstants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { CardActions } from '../util/metrics';
import { Linking } from 'react-native';

export enum CardInternalBrowserPage {
  TRAVEL = 'travel',
  TOS = 'tos',
  CARD = 'card',
}

const PAGE_CONFIG: Record<
  CardInternalBrowserPage,
  {
    urlCheck: (url: string) => boolean;
    getUrl: () => string;
    action: CardActions;
  }
> = {
  [CardInternalBrowserPage.CARD]: {
    urlCheck: isCardUrl,
    getUrl: () => AppConstants.CARD.URL,
    action: CardActions.NAVIGATE_TO_CARD_PAGE,
  },
  [CardInternalBrowserPage.TRAVEL]: {
    urlCheck: isCardTravelUrl,
    getUrl: () => AppConstants.CARD.TRAVEL_URL,
    action: CardActions.NAVIGATE_TO_TRAVEL_PAGE,
  },
  [CardInternalBrowserPage.TOS]: {
    urlCheck: isCardTosUrl,
    getUrl: () => AppConstants.CARD.CARD_TOS_URL,
    action: CardActions.NAVIGATE_TO_CARD_TOS_PAGE,
  },
};

export const useNavigateToInternalBrowserPage = (
  navigation: NavigationProp<ParamListBase>,
) => {
  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const { trackEvent, createEventBuilder } = useMetrics();

  const navigateToInternalBrowserPage = useCallback(
    (page: CardInternalBrowserPage) => {
      const { urlCheck, getUrl, action } = PAGE_CONFIG[page];

      if (page === CardInternalBrowserPage.TOS) {
        Linking.openURL(getUrl());
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
            .addProperties({
              action,
            })
            .build(),
        );
        return;
      }

      const existingTab = browserTabs?.find(({ url }: BrowserTab) =>
        urlCheck(url),
      );

      let existingTabId;
      let newTabUrl;

      if (existingTab) {
        existingTabId = existingTab.id;
      } else {
        newTabUrl = getUrl();
      }

      const params = {
        ...(newTabUrl && { newTabUrl }),
        ...(existingTabId && { existingTabId, newTabUrl: undefined }),
        timestamp: Date.now(),
      };

      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params,
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action,
          })
          .build(),
      );
    },
    [browserTabs, navigation, trackEvent, createEventBuilder],
  );

  return {
    navigateToInternalBrowserPage,
  };
};

/**
 * Hook that provides navigation functions for Card-related internal browser pages.
 * Returns convenience methods for navigating to Card, Travel, and TOS pages.
 */
export const useNavigateToCardPage = (
  navigation: NavigationProp<ParamListBase>,
) => {
  const { navigateToInternalBrowserPage } =
    useNavigateToInternalBrowserPage(navigation);

  const navigateToCardPage = useCallback(() => {
    navigateToInternalBrowserPage(CardInternalBrowserPage.CARD);
  }, [navigateToInternalBrowserPage]);

  const navigateToTravelPage = useCallback(() => {
    navigateToInternalBrowserPage(CardInternalBrowserPage.TRAVEL);
  }, [navigateToInternalBrowserPage]);

  const navigateToCardTosPage = useCallback(() => {
    navigateToInternalBrowserPage(CardInternalBrowserPage.TOS);
  }, [navigateToInternalBrowserPage]);

  return {
    navigateToCardPage,
    navigateToTravelPage,
    navigateToCardTosPage,
  };
};
