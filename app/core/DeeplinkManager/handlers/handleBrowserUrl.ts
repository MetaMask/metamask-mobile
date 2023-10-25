import Routes from '../../../constants/navigation/Routes';
import { InteractionManager } from 'react-native';
import { DeeplinkManager } from '../DeeplinkManager';

function handleBrowserUrl({
  instance,
  url,
  callback,
}: {
  instance: DeeplinkManager;
  url: string;
  callback: (url: string) => void;
}) {
  InteractionManager.runAfterInteractions(() => {
    if (callback) {
      callback(url);
    } else {
      instance.navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
        },
      });
    }
  });
}

export default handleBrowserUrl;
