// Handles deep link modal display - analytics tracked in handleUniversalLink
import {
  createDeepLinkModalNavDetails,
  DeepLinkModalParams,
} from '../../../components/UI/DeepLinkModal';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import ReduxService from '../../redux';
import NavigationService from '../../NavigationService';

const handleDeepLinkModalDisplay = (
  params: DeepLinkModalParams,
  { forceShow = false }: { forceShow?: boolean } = {},
): void => {
  // TODO: Update name since this is meant to remove interstitial if don't remind me again was toggled
  const deepLinkModalDisabled = selectDeepLinkModalDisabled(
    ReduxService.store.getState(),
  );

  if (params.linkType === 'private' && deepLinkModalDisabled && !forceShow) {
    // Skip interstitial if don't remind me again was toggled
    params.onContinue();
    return;
  }
  NavigationService.navigation.navigate(
    ...createDeepLinkModalNavDetails(params),
  );
};

export default handleDeepLinkModalDisplay;
