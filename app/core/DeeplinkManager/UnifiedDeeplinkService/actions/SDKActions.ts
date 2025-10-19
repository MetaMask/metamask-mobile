import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import SDKConnect from '../../../SDKConnect/SDKConnect';
import handleDeeplink from '../../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import AppConstants from '../../../AppConstants';
import Routes from '../../../../constants/navigation/Routes';
import parseOriginatorInfo from '../../parseOriginatorInfo';
import { OriginatorInfo } from '@metamask/sdk-communication-layer';

/**
 * Creates a unified handler for SDK connect action
 */
export const createConnectAction = (): DeeplinkAction => ({
  name: ACTIONS.CONNECT,
  supportedSchemes: ['metamask://'],
  description: 'Handles SDK connection',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('SDKActions: Handling connect action', {
      channelId: params.params.channelId,
      comm: params.params.comm,
      redirect: params.params.redirect,
    });

    const sdkConnect = SDKConnect.getInstance();

    // Handle redirect to dapp notification
    if (
      params.params.redirect &&
      params.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
    ) {
      sdkConnect.state.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        hideReturnToApp: params.params.hr,
      });
      return;
    }

    if (!params.params.channelId) {
      throw new Error('No channelId provided for connect action');
    }

    // Handle deeplinking vs socket connection
    if (params.params.comm === 'deeplinking') {
      if (!params.params.scheme) {
        throw new Error('DeepLinkManager failed to connect - Invalid scheme');
      }

      sdkConnect.state.deeplinkingService?.handleConnection({
        channelId: params.params.channelId,
        url: params.originalUrl,
        scheme: params.params.scheme,
        dappPublicKey: params.params.pubkey,
        originatorInfo: params.params.originatorInfo,
        request: params.params.request,
      });
    } else {
      // Socket connection
      const protocolVersion = parseInt(params.params.v ?? '1', 10);

      let originatorInfo: OriginatorInfo | undefined;
      if (params.params.originatorInfo) {
        originatorInfo = parseOriginatorInfo({
          base64OriginatorInfo: params.params.originatorInfo,
        });
      }

      await handleDeeplink({
        channelId: params.params.channelId,
        origin: params.origin || 'deeplink',
        url: params.originalUrl,
        protocolVersion,
        context: 'deeplink_scheme',
        originatorInfo,
        rpc: params.params.rpc,
        hideReturnToApp: params.params.hr,
        otherPublicKey: params.params.pubkey,
        sdkConnect,
      });
    }
  },
});

/**
 * Creates a unified handler for MMSDK action
 */
export const createMMSDKAction = (): DeeplinkAction => ({
  name: ACTIONS.MMSDK,
  supportedSchemes: ['metamask://'],
  description: 'Handles MM SDK messages',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('SDKActions: Handling MMSDK action', {
      channelId: params.params.channelId,
      message: params.params.message ? 'present' : 'missing',
    });

    const sdkConnect = SDKConnect.getInstance();

    if (!params.params.message) {
      throw new Error(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid message',
      );
    }

    if (!params.params.channelId || !params.params.pubkey) {
      throw new Error(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid channelId or pubkey',
      );
    }

    if (!params.params.account) {
      sdkConnect.state.deeplinkingService?.handleMessage({
        channelId: params.params.channelId,
        message: params.params.message,
        dappPublicKey: params.params.pubkey,
      });
    } else {
      sdkConnect.state.deeplinkingService?.handleMessage({
        channelId: params.params.channelId,
        message: params.params.message,
        dappPublicKey: params.params.pubkey,
        account: params.params.account,
      });
    }
  },
});

/**
 * Creates a unified handler for Android SDK binding
 */
export const createAndroidSDKAction = (): DeeplinkAction => ({
  name: ACTIONS.ANDROID_SDK,
  supportedSchemes: ['metamask://'],
  description: 'Binds Android SDK',
  handler: async (_params: DeeplinkParams) => {
    DevLogger.log('SDKActions: Handling Android SDK binding');

    try {
      await SDKConnect.getInstance().bindAndroidSDK();
    } catch (err) {
      Logger.error(err as Error, 'DeepLinkManager failed to bind Android SDK');
      throw err;
    }
  },
});

/**
 * Register all SDK-related actions
 */
export const registerSDKActions = (registry: ActionRegistry) => {
  registry.registerMany([
    createConnectAction(),
    createMMSDKAction(),
    createAndroidSDKAction(),
  ]);
};
