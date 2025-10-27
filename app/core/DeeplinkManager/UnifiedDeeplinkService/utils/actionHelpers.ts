import { NavigationProp, ParamListBase } from '@react-navigation/native';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { DeeplinkParams } from '../ActionRegistry';

/**
 * Common patterns for deeplink action handlers
 */

export interface NavigationConfig {
  view: string;
  screen?: string;
  params?: Record<string, unknown>;
}

/**
 * Helper to handle navigation with logging
 */
export const navigateWithLogging = (
  navigation: NavigationProp<ParamListBase> | undefined,
  config: NavigationConfig,
  actionName: string,
) => {
  DevLogger.log(`${actionName}: Navigating to ${config.view}`, config);

  if (!navigation) {
    DevLogger.log(`${actionName}: No navigation object available`);
    return;
  }

  navigation.navigate(config.view, config.params);
};

/**
 * Helper to construct URL from action and path
 */
export const constructUrl = (
  action: string,
  path: string,
  scheme: string,
): string => {
  const baseUrl =
    scheme === 'https:' ? 'https://link.metamask.io' : 'metamask://';
  return `${baseUrl}${action}${path}`;
};

/**
 * Helper to validate required parameters
 */
export const validateRequiredParams = (
  params: DeeplinkParams,
  required: string[],
  actionName: string,
): void => {
  const missing = required.filter(
    (field) => !params.params[field as keyof typeof params.params],
  );

  if (missing.length > 0) {
    const error = `${actionName}: Missing required parameters: ${missing.join(
      ', ',
    )}`;
    DevLogger.log(error);
    throw new Error(error);
  }
};

/**
 * Helper to create a simple navigation handler
 */
export const createSimpleNavigationHandler =
  (
    actionName: string,
    navigationConfig:
      | NavigationConfig
      | ((params: DeeplinkParams) => NavigationConfig),
  ) =>
  async (params: DeeplinkParams) => {
    DevLogger.log(`${actionName}: Handling action`, {
      path: params.path,
      queryParams: params.params,
    });

    const config =
      typeof navigationConfig === 'function'
        ? navigationConfig(params)
        : navigationConfig;

    navigateWithLogging(params.navigation, config, actionName);
  };

/**
 * Helper to create handlers that delegate to existing functions
 */
export const createDelegatingHandler =
  (
    actionName: string,
    delegateFunction: (options: Record<string, unknown>) => Promise<void>,
    optionsBuilder: (params: DeeplinkParams) => Record<string, unknown>,
  ) =>
  async (params: DeeplinkParams) => {
    DevLogger.log(`${actionName}: Handling action`, {
      path: params.path,
      queryParams: params.params,
    });

    const options = optionsBuilder(params);
    await delegateFunction(options);
  };

/**
 * Extract address from path (common pattern)
 */
export const extractAddressFromPath = (path: string): string => {
  // Remove leading slash and any additional path segments
  const segments = path.split('/').filter(Boolean);
  return segments[0] || '';
};

/**
 * Common error handler wrapper
 */
export const withErrorHandling =
  (handler: (params: DeeplinkParams) => Promise<void>, actionName: string) =>
  async (params: DeeplinkParams) => {
    try {
      await handler(params);
    } catch (error) {
      DevLogger.log(`${actionName}: Error handling action`, error);
      throw error;
    }
  };
