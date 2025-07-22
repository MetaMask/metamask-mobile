'use strict';

import parseDeeplink from './ParseManager/parseDeeplink';
import branch from 'react-native-branch';
import Logger from '../../util/Logger';
import { Linking } from 'react-native';
import Device from '../../util/device';
import { handleDeeplink } from './Handlers/handleDeeplink';

class DeeplinkManager {
  static pendingDeeplink: string | null = null;

  static start() {
    Linking.getInitialURL().then((url) => {
      if (!url) {
        return;
      }
      Logger.log(`handleDeeplink:: got initial URL ${url}`);
      handleDeeplink({ uri: url });
    });
    if (Device.isAndroid()) {
      Linking.addEventListener('url', (params) => {
        const { url } = params;
        handleDeeplink({ uri: url });
      });
    }
    branch.subscribe((opts) => {
      const { error } = opts;
      if (error) {
        const branchError = new Error(error);
        Logger.error(branchError, 'Error subscribing to branch.');
      }
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
