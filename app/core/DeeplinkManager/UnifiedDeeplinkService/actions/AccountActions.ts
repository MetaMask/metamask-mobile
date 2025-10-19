import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS, PREFIXES } from '../../../../constants/deeplinks';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import handleCreateAccountUrl from '../../Handlers/handleCreateAccountUrl';
import handleRewardsUrl from '../../Handlers/handleRewardsUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import DeeplinkManager from '../../DeeplinkManager';

/**
 * Creates a unified handler for create account action
 */
export const createAccountAction = (): DeeplinkAction => ({
  name: ACTIONS.CREATE_ACCOUNT,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the create account flow',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('AccountActions: Handling create account action', {
      path: params.path,
      queryParams: params.params,
    });

    handleCreateAccountUrl({
      path: params.path,
      navigation: params.navigation as NavigationProp<ParamListBase>,
    });
  },
});

/**
 * Creates a unified handler for rewards action
 */
export const createRewardsAction = (): DeeplinkAction => ({
  name: ACTIONS.REWARDS,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the rewards screen',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('AccountActions: Handling rewards action', {
      path: params.path,
      queryParams: params.params,
    });

    handleRewardsUrl({
      rewardsPath: params.path,
    });
  },
});

/**
 * Creates a unified handler for send action
 * Special case: transforms URL and re-parses it
 */
export const createSendAction = (): DeeplinkAction => ({
  name: ACTIONS.SEND,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the send flow',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('AccountActions: Handling send action', {
      path: params.path,
      queryParams: params.params,
      originalUrl: params.originalUrl,
    });

    // For universal links, we need to transform the URL to ethereum: protocol
    // and re-parse it through the deeplink manager
    if (params.scheme.includes('http')) {
      // Construct ethereum URL
      const ethereumUrl = `${PREFIXES[ACTIONS.SEND]}${params.path}`;

      // Re-parse through deeplink manager
      // Note: We need access to the DeeplinkManager instance
      // This will be handled when integrating with the main service
      const deeplinkManager = new DeeplinkManager();
      deeplinkManager.navigation = params.navigation;

      await deeplinkManager.parse(ethereumUrl, {
        origin: params.origin || 'deeplink',
      });
    } else {
      // For traditional deeplinks, construct the full URL and re-parse
      const fullUrl = `${params.originalUrl}`;

      const deeplinkManager = new DeeplinkManager();
      deeplinkManager.navigation = params.navigation;

      await deeplinkManager.parse(fullUrl, {
        origin: params.origin || 'deeplink',
      });
    }
  },
});

/**
 * Register all account-related actions
 */
export const registerAccountActions = (registry: ActionRegistry) => {
  registry.registerMany([
    createAccountAction(),
    createRewardsAction(),
    createSendAction(),
  ]);
};
