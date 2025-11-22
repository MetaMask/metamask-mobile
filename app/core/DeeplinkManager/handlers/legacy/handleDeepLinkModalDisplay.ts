import {
  createDeepLinkModalNavDetails,
  DeepLinkModalParams,
} from '../../../../components/UI/DeepLinkModal';
import { selectDeepLinkModalDisabled } from '../../../../selectors/settings';
import { store } from '../../../../store';
import NavigationService from '../../../NavigationService';

const handleDeepLinkModalDisplay = (params: DeepLinkModalParams) => {
  // TODO: Update name since this is meant to remove interstitial if don't remind me again was toggled
  const deepLinkModalDisabled = selectDeepLinkModalDisabled(store.getState());

  if (params.linkType === 'private' && deepLinkModalDisabled) {
    // Skip interstitial if don't remind me again was toggled
    params.onContinue();
    return;
  }
  NavigationService.navigation.navigate(
    ...createDeepLinkModalNavDetails(params),
  );
};

export default handleDeepLinkModalDisplay;
