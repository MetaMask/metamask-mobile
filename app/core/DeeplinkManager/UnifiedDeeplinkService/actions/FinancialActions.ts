import {
  DeeplinkAction,
  DeeplinkParams,
  ActionRegistry,
} from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import handleDepositCashUrl from '../../Handlers/handleDepositCashUrl';
import handleSwapUrl from '../../Handlers/handleSwapUrl';
import navigateToHomeUrl from '../../Handlers/handleHomeUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

/**
 * Creates a unified handler for deposit action
 */
export const createDepositAction = (): DeeplinkAction => ({
  name: ACTIONS.DEPOSIT,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the deposit cash flow',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('FinancialActions: Handling deposit action', {
      path: params.path,
      queryParams: params.params,
    });

    handleDepositCashUrl({
      depositPath: params.path,
      navigation: params.navigation as NavigationProp<ParamListBase>,
    });
  },
});

/**
 * Creates a unified handler for swap action
 */
export const createSwapAction = (): DeeplinkAction => ({
  name: ACTIONS.SWAP,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Opens the swap flow',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('FinancialActions: Handling swap action', {
      path: params.path,
      queryParams: params.params,
    });

    handleSwapUrl({
      swapPath: params.path,
    });
  },
});

/**
 * Creates a unified handler for home action
 */
export const createHomeAction = (): DeeplinkAction => ({
  name: ACTIONS.HOME,
  supportedSchemes: ['metamask://', 'https://'],
  description: 'Navigates to the home screen',
  handler: async (params: DeeplinkParams) => {
    DevLogger.log('FinancialActions: Handling home action', {
      path: params.path,
    });

    navigateToHomeUrl({ homePath: params.path });
  },
});

/**
 * Register all financial-related actions
 */
export const registerFinancialActions = (registry: ActionRegistry) => {
  registry.registerMany([
    createDepositAction(),
    createSwapAction(),
    createHomeAction(),
  ]);
};
