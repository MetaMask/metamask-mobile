import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { BrowserTab } from '../../Tokens/types';
import { isCardUrl } from '../../../../util/url';
import AppConstants from '../../../../core/AppConstants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

export const useNavigateToCardPage = (
  navigation: NavigationProp<ParamListBase>,
) => {
  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const { trackEvent, createEventBuilder } = useMetrics();

  const navigateToCardPage = () => {
    const existingCardTab = browserTabs?.find(({ url }: BrowserTab) =>
      isCardUrl(url),
    );

    let existingTabId;
    let newTabUrl;

    if (existingCardTab) {
      existingTabId = existingCardTab.id;
    } else {
      const cardUrl = new URL(AppConstants.CARD.URL);
      newTabUrl = cardUrl.href;
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
      createEventBuilder(
        MetaMetricsEvents.CARD_ADVANCED_CARD_MANAGEMENT_CLICKED,
      ).build(),
    );
  };

  return {
    navigateToCardPage,
  };
};
