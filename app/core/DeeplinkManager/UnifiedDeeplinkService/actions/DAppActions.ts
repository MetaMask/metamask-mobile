import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS, PREFIXES } from '../../../../constants/deeplinks';
import handleBrowserUrl from '../../Handlers/handleBrowserUrl';
import handlePerpsUrl from '../../Handlers/handlePerpsUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import DeeplinkManager from '../../DeeplinkManager';

/**
 * Creates a unified handler for dapp action
 */
export const createDappAction = (): DeeplinkAction => ({
  name: ACTIONS.DAPP,
  supportedSchemes: ['dapp://', 'https://'],
  description: 'Opens a dapp in the browser',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('DAppActions: Handling dapp action', {
      path: params.path,
      originalUrl: params.originalUrl,
    });

    let deeplinkUrl: string;

    if (params.scheme.includes('http')) {
      // For universal links, replace the base URL with https://
      deeplinkUrl = params.originalUrl.replace(
        /^https?:\/\/[^/]+\/dapp\//,
        PREFIXES[ACTIONS.DAPP],
      );
    } else {
      // For dapp:// protocol, use as is
      deeplinkUrl = params.originalUrl;
    }

    handleBrowserUrl({
      deeplinkManager: {} as unknown as DeeplinkManager, // Will be injected during integration
      url: deeplinkUrl,
      callback: params.params.browserCallBack as
        | ((url: string) => void)
        | undefined,
    });
  },
});

/**
 * Creates a unified handler for perps action
 */
export const createPerpsAction = (): DeeplinkAction => ({
  name: ACTIONS.PERPS,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the perps trading interface',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('DAppActions: Handling perps action', {
      path: params.path,
      queryParams: params.params,
    });

    handlePerpsUrl({
      perpsPath: params.path,
    });
  },
});

/**
 * Creates a unified handler for perps-markets action
 */
export const createPerpsMarketsAction = (): DeeplinkAction => ({
  name: ACTIONS.PERPS_MARKETS,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the perps markets list',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('DAppActions: Handling perps-markets action', {
      path: params.path,
      queryParams: params.params,
    });

    handlePerpsUrl({
      perpsPath: params.path,
    });
  },
});

/**
 * Creates a unified handler for perps-asset action
 */
export const createPerpsAssetAction = (): DeeplinkAction => ({
  name: ACTIONS.PERPS_ASSET,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens a specific perps asset',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('DAppActions: Handling perps-asset action', {
      path: params.path,
      queryParams: params.params,
    });

    handlePerpsUrl({
      perpsPath: `${params.path}${
        params.originalUrl.includes('?')
          ? params.originalUrl.substring(params.originalUrl.indexOf('?'))
          : ''
      }`,
    });
  },
});

/**
 * Register all DApp-related actions
 */
export const registerDAppActions = (registry: ActionRegistry) => {
  registry.registerMany([
    createDappAction(),
    createPerpsAction(),
    createPerpsMarketsAction(),
    createPerpsAssetAction(),
  ]);
};
