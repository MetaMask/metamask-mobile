import Routes from '../../../../constants/navigation/Routes';
import { InteractionManager } from 'react-native';
import { EXTERNAL_LINK_TYPE } from '../../../../constants/browser';
import NavigationService from '../../../NavigationService';

function handleBrowserUrl({
  url,
  callback,
}: {
  url: string;
  callback?: (url: string) => void;
}) {
  const handle = InteractionManager.runAfterInteractions(() => {
    if (callback) {
      callback(url);
    } else {
      NavigationService.navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          linkType: EXTERNAL_LINK_TYPE,
          timestamp: Date.now(),
        },
      });
    }
  });
  if (handle?.done) {
    handle.done();
  }
}

export default handleBrowserUrl;
