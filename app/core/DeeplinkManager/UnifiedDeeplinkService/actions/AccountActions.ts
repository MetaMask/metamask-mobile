import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS, PREFIXES , ETH_ACTIONS } from '../../../../constants/deeplinks';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { handleCreateAccountUrl } from '../../Handlers/handleCreateAccountUrl';
import { handleRewardsUrl } from '../../Handlers/handleRewardsUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { parse } from 'eth-url-parser';
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

    try {
      // For universal links, construct ethereum URL
      const ethereumUrl = params.scheme.includes('http')
        ? `${PREFIXES[ACTIONS.SEND]}${params.path}`
        : params.originalUrl;

      // Parse the ethereum URL directly
      const ethUrl = parse(ethereumUrl);

      // Create txMeta object
      const txMeta = {
        ...ethUrl,
        source: params.originalUrl,
        action:
          ethUrl.function_name === ETH_ACTIONS.TRANSFER
            ? 'send-token'
            : 'send-eth',
      };

      // Navigate directly - no new DeeplinkManager instance!
      if (ethUrl.function_name === ETH_ACTIONS.TRANSFER) {
        params.navigation?.navigate('SendView', {
          screen: 'Send',
          params: { txMeta },
        });
      } else if (ethUrl.parameters?.value) {
        params.navigation?.navigate('SendView', {
          screen: 'Send',
          params: { txMeta },
        });
      } else {
        params.navigation?.navigate('SendFlowView', {
          screen: 'SendTo',
          params: { txMeta },
        });
      }
    } catch (error) {
      DevLogger.log('AccountActions: Error handling send action', error);
      throw error;
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
