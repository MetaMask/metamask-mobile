'use strict';

import parseDeeplink from './ParseManager/parseDeeplink';
import branch from 'react-native-branch';
import Logger from '../../util/Logger';
import { Linking } from 'react-native';
import { handleDeeplink } from './Handlers/handleDeeplink';

class DeeplinkManager {
  static pendingDeeplink: string | null = null;

  static start() {
    const getBranchDeeplink = async (uri?: string) => {
      if (uri) {
        handleDeeplink({ uri });
        return;
      }

      try {
        const latestParams = await branch.getLatestReferringParams();
        const deeplink = latestParams?.['+non_branch_link'] as string;
        if (deeplink) {
          handleDeeplink({ uri: deeplink });
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
    };

    Linking.getInitialURL().then((url) => {
      if (!url) {
        return;
      }
      Logger.log(`handleDeeplink:: got initial URL ${url}`);
      handleDeeplink({ uri: url });
    });

    Linking.addEventListener('url', (params) => {
      const { url } = params;
      handleDeeplink({ uri: url });
    });

    // branch.subscribe is not called for iOS cold start after the new RN architecture upgrade.
    // This is a workaround to ensure that the deeplink is processed for iOS cold start.
    // TODO: Remove this once branch.subscribe is called for iOS cold start.
    getBranchDeeplink();

    branch.subscribe((opts) => {
      const { error } = opts;
      if (error) {
        const branchError = new Error(error);
        Logger.error(branchError, 'Error subscribing to branch.');
      }
      getBranchDeeplink(opts.uri);
      //TODO: that async call in the subscribe doesn't look good to me
      branch.getLatestReferringParams().then((val) => {
        const deeplink = opts.uri || (val['+non_branch_link'] as string);
        handleDeeplink({ uri: deeplink });
      });
    });
  }

  static setDeeplink(url: string) {
    this.pendingDeeplink = url;
  }

  static getPendingDeeplink() {
    return this.pendingDeeplink;
  }

  static expireDeeplink() {
    this.pendingDeeplink = null;
  }

  static async parse(
    url: string,
    {
      browserCallBack,
      origin,
      onHandled,
    }: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ) {
    return await parseDeeplink({
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  }
}

export default DeeplinkManager;
