import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import handleRampUrl from '../../Handlers/handleRampUrl';
import { RampType } from '../../../../components/UI/Ramp/Aggregator/types';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

/**
 * Creates a unified handler for buy crypto action
 */
export const createBuyCryptoAction = (): DeeplinkAction => ({
  name: ACTIONS.BUY,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the buy crypto flow',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('RampActions: Handling buy crypto action', {
      path: params.path,
      queryParams: params.params,
    });

    handleRampUrl({
      rampPath: params.path,
      navigation: params.navigation as NavigationProp<ParamListBase>,
      rampType: RampType.BUY,
    });
  },
});

/**
 * Creates a unified handler for buy-crypto action (alias for buy)
 */
export const createBuyCryptoAliasAction = (): DeeplinkAction => ({
  name: ACTIONS.BUY_CRYPTO,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the buy crypto flow (alias)',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('RampActions: Handling buy-crypto action', {
      path: params.path,
      queryParams: params.params,
    });

    handleRampUrl({
      rampPath: params.path,
      navigation: params.navigation as NavigationProp<ParamListBase>,
      rampType: RampType.BUY,
    });
  },
});

/**
 * Creates a unified handler for sell crypto action
 */
export const createSellCryptoAction = (): DeeplinkAction => ({
  name: ACTIONS.SELL,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the sell crypto flow',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('RampActions: Handling sell crypto action', {
      path: params.path,
      queryParams: params.params,
    });

    handleRampUrl({
      rampPath: params.path,
      navigation: params.navigation as NavigationProp<ParamListBase>,
      rampType: RampType.SELL,
    });
  },
});

/**
 * Creates a unified handler for sell-crypto action (alias for sell)
 */
export const createSellCryptoAliasAction = (): DeeplinkAction => ({
  name: ACTIONS.SELL_CRYPTO,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the sell crypto flow (alias)',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('RampActions: Handling sell-crypto action', {
      path: params.path,
      queryParams: params.params,
    });

    handleRampUrl({
      rampPath: params.path,
      navigation: params.navigation as NavigationProp<ParamListBase>,
      rampType: RampType.SELL,
    });
  },
});

/**
 * Register all ramp-related actions
 */
export const registerRampActions = (registry: ActionRegistry) => {
  registry.registerMany([
    createBuyCryptoAction(),
    createBuyCryptoAliasAction(),
    createSellCryptoAction(),
    createSellCryptoAliasAction(),
  ]);
};
