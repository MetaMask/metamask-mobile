import Logger from '../../../../util/Logger';
import {
  TokenSearchApiService,
  TokenSearchDiscoveryController,
  TokenDiscoveryApiService,
} from '@metamask/token-search-discovery-controller';
import { TokenSearchDiscoveryControllerParams } from './types';
import { PORTFOLIO_API_URL } from './constants';

const getPortfolioApiBaseUrl = () => {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    // TODO: Replace local with dev
    case 'local':
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

export const createTokenSearchDiscoveryController = ({
  state,
  messenger,
}: TokenSearchDiscoveryControllerParams) => {
  try {
    const baseUrl = getPortfolioApiBaseUrl();
    const controller = new TokenSearchDiscoveryController({
      state,
      messenger,
      tokenSearchService: new TokenSearchApiService(baseUrl),
      tokenDiscoveryService: new TokenDiscoveryApiService(baseUrl),
    });
    return controller;
  } catch (error) {
    Logger.error(error as Error);
    throw error;
  }
};
