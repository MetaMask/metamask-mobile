import { InteractionManager } from 'react-native';
import {
  createDeepLinkModalNavDetails,
  DeepLinkModalProps,
} from '../../../components/UI/DeepLinkModal/constant';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import { store } from '../../../store';
import NavigationService from '../../../core/NavigationService';

const handleDeepLinkModalDisplay = (props: DeepLinkModalProps) => {
  // TODO: Update name since this is meant to remove interstitial if don't remind me again was toggled
  const deepLinkModalDisabled = selectDeepLinkModalDisabled(store.getState());

  if (props.linkType === 'private' && deepLinkModalDisabled) {
    // Skip interstitial if don't remind me again was toggled
    props.onContinue();
    return;
  }
  NavigationService.navigation.navigate(
    ...createDeepLinkModalNavDetails(props),
  );
};

export default handleDeepLinkModalDisplay;
