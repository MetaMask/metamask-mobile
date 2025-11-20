import { ControllerInitFunction } from '../types';
import {
  TokenDiscoveryApiService,
  TokenSearchApiService,
  TokenSearchDiscoveryController,
  type TokenSearchDiscoveryControllerMessenger,
} from '@metamask/token-search-discovery-controller';

const PORTFOLIO_API_URL = {
  dev: 'https://portfolio.dev-api.cx.metamask.io/',
  prod: 'https://portfolio.api.cx.metamask.io/',
};

const getPortfolioApiBaseUrl = () => {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'dev':
    case 'e2e':
      return PORTFOLIO_API_URL.dev;
    case 'pre-release':
    case 'production':
    case 'beta':
    case 'rc':
    case 'exp':
      return PORTFOLIO_API_URL.prod;
    default:
      return PORTFOLIO_API_URL.dev;
  }
};

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
  const baseUrl = getPortfolioApiBaseUrl();

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
