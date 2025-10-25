import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';
import WC2Manager from '../../../WalletConnect/WalletConnectV2';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';

/**
 * Creates a unified handler for WalletConnect action
 */
export const createWalletConnectAction = (): DeeplinkAction => ({
  name: ACTIONS.WC,
  supportedSchemes: ['*'], // Supports all schemes
  description: 'Handles WalletConnect connection',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('ProtocolActions: Handling WalletConnect action', {
      uri: params.params.uri,
      originalUrl: params.originalUrl,
    });

    const wcUri = params.params.uri || params.originalUrl;

    try {
      const WC2ManagerInstance = await WC2Manager.getInstance();
      await WC2ManagerInstance.connect({
        wcUri,
        origin: params.origin || 'deeplink',
        redirectUrl: params.params.redirect,
      });
    } catch (err) {
      Logger.error(
        err as Error,
        'DeepLinkManager failed to connect via WalletConnect',
      );
      throw err;
    }
  },
});

/**
 * Creates a unified handler for ethereum:// protocol
 * Note: This is handled as a protocol, not an action in the original code
 */
export const createEthereumProtocolAction = (): DeeplinkAction => ({
  name: PROTOCOLS.ETHEREUM,
  supportedSchemes: ['ethereum://'],
  description: 'Handles ethereum:// protocol URLs',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('ProtocolActions: Handling ethereum protocol', {
      originalUrl: params.originalUrl,
      origin: params.origin,
    });

    // This will be handled by the DeeplinkManager instance
    // when we integrate the unified service
    throw new Error('Ethereum protocol handler needs DeeplinkManager instance');
  },
});

/**
 * Creates a unified handler for focus action (empty action)
 */
export const createFocusAction = (): DeeplinkAction => ({
  name: ACTIONS.FOCUS,
  supportedSchemes: ['metamask://'],
  description: 'Focuses the app without specific action',
  handler: async (_params: DeeplinkParams) => {
    DevLogger.log('ProtocolActions: Handling focus action');
    // No specific action needed - just focuses the app
  },
});

/**
 * Creates a unified handler for empty action
 */
export const createEmptyAction = (): DeeplinkAction => ({
  name: ACTIONS.EMPTY,
  supportedSchemes: ['metamask://'],
  description: 'Handles empty metamask:// URLs',
  handler: async (_params: DeeplinkParams) => {
    DevLogger.log('ProtocolActions: Handling empty action');
    // No specific action needed - just opens the app
  },
});

/**
 * Register all protocol-related actions
 */
export const registerProtocolActions = (registry: ActionRegistry) => {
  registry.registerMany([
    createWalletConnectAction(),
    createFocusAction(),
    createEmptyAction(),
    // Note: Ethereum protocol is handled differently
  ]);
};
