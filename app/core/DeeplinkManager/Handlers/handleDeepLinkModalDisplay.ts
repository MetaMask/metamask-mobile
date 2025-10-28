// Handles deep link modal display - analytics tracked in handleUniversalLink
import {
  createDeepLinkModalNavDetails,
  DeepLinkModalParams,
} from '../../../components/UI/DeepLinkModal';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import { store } from '../../../store';
import NavigationService from '../../../core/NavigationService';
import { DeepLinkAnalyticsContext } from '../types/deepLinkAnalytics.types';

const handleDeepLinkModalDisplay = async (
  params: DeepLinkModalParams,
  deepLinkContext?: DeepLinkAnalyticsContext,
) => {
  const deepLinkModalDisabled = selectDeepLinkModalDisabled(store.getState());

  if (params.linkType === 'private' && deepLinkModalDisabled) {
    // Skip interstitial if don't remind me again was toggled
    params.onContinue();
    return;
  }
  NavigationService.navigation.navigate(
    ...createDeepLinkModalNavDetails({
      ...params,
      deepLinkContext,
    }),
  );
};

export default handleDeepLinkModalDisplay;
