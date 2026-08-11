import Routes from '../../../../constants/navigation/Routes';
import { InteractionManager } from 'react-native';
import { EXTERNAL_LINK_TYPE } from '../../../../constants/browser';
import Logger from '../../../../util/Logger';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

export const createBrowserDeeplinkIntent = ({
  url,
}: {
  url: string;
}): DeeplinkIntent => ({
  target: {
    type: 'home-tab',
    routeName: Routes.BROWSER.HOME,
    params: {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: url,
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: Date.now(),
      },
    },
  },
});

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
      executeDeeplinkIntent(createBrowserDeeplinkIntent({ url })).catch(
        (error) => {
          Logger.error(
            error as Error,
            'DeepLinkManager: handleBrowserUrl failed',
          );
        },
      );
    }
  });
  if (handle?.done) {
    handle.done();
  }
}

export default handleBrowserUrl;
