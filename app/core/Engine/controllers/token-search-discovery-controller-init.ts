import { ControllerInitFunction } from '../types';
import {
  TokenDiscoveryApiService,
  TokenSearchApiService,
  TokenSearchDiscoveryController,
  type TokenSearchDiscoveryControllerMessenger,
} from '@metamask/token-search-discovery-controller';

// URL is set at build time via builds.yml, fallback for local dev
const PORTFOLIO_API_URL =
  process.env.PORTFOLIO_API_URL || 'https://portfolio.dev-api.cx.metamask.io';

/**
 * Initialize the token search discovery controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenSearchDiscoveryControllerInit: ControllerInitFunction<
  TokenSearchDiscoveryController,
  TokenSearchDiscoveryControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const baseUrl = PORTFOLIO_API_URL;

  const controller = new TokenSearchDiscoveryController({
    messenger: controllerMessenger,
    state: persistedState.TokenSearchDiscoveryController,
    tokenSearchService: new TokenSearchApiService(baseUrl),
    tokenDiscoveryService: new TokenDiscoveryApiService(baseUrl),
  });

  return {
    controller,
  };
};
