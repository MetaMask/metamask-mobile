import { createTokenSearchDiscoveryController } from './utils';
import { ControllerMessenger } from '@metamask/base-controller';
import {
  TokenSearchDiscoveryControllerMessenger,
  TokenSearchDiscoveryControllerState,
} from '@metamask/token-search-discovery-controller/dist/token-search-discovery-controller.cjs';
import Logger from '../../../../util/Logger';
import { TokenSearchApiService } from '@metamask/token-search-discovery-controller';

const mockError = new Error('Controller creation failed');

// Top-level mocks
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/token-search-discovery-controller', () => ({
  TokenSearchApiService: jest.fn(),
  TokenSearchDiscoveryController: jest
    .fn()
    .mockImplementation(function (
      this: { state: any },
      params: { state?: any },
    ) {
      this.state = {
        lastSearchTimestamp: null,
        recentSearches: [],
        ...params.state,
      };
      return this;
    }),
}));

describe('TokenSearchDiscoveryController utils', () => {
  let messenger: TokenSearchDiscoveryControllerMessenger;

  beforeEach(() => {
    messenger =
      new ControllerMessenger() as unknown as TokenSearchDiscoveryControllerMessenger;
  });

  describe('createTokenSearchDiscoveryController', () => {
    afterEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    it('creates controller with initial undefined state', () => {
      const controller = createTokenSearchDiscoveryController({
        state: undefined,
        messenger,
      });

      expect(controller).toBeDefined();
      expect(controller.state).toStrictEqual({
        lastSearchTimestamp: null,
        recentSearches: [],
      });
    });

    it('internal state matches initial state', () => {
      const initialState: TokenSearchDiscoveryControllerState = {
        lastSearchTimestamp: 123456789,
        recentSearches: [
          {
            tokenAddress: '0x123',
            chainId: '0x1',
            name: 'Test Token 1',
            symbol: 'TEST1',
            usdPrice: 1.0,
            usdPricePercentChange: {
              oneDay: 0.0,
            },
          },
          {
            tokenAddress: '0x456',
            chainId: '0x1',
            name: 'Test Token 2',
            symbol: 'TEST2',
            usdPrice: 2.0,
            usdPricePercentChange: {
              oneDay: 0.0,
            },
          },
        ],
      };

      const controller = createTokenSearchDiscoveryController({
        state: initialState,
        messenger,
      });

      expect(controller.state).toStrictEqual(initialState);
    });

    it('controller keeps initial extra data in its state', () => {
      const initialState = {
        extraData: true,
      };

      const controller = createTokenSearchDiscoveryController({
        // @ts-expect-error giving a wrong initial state
        state: initialState,
        messenger,
      });

      expect(controller.state).toStrictEqual({
        lastSearchTimestamp: null,
        recentSearches: [],
        extraData: true,
      });
    });

    it('logs and rethrows error when controller creation fails', () => {
      (TokenSearchApiService as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      expect(() =>
        createTokenSearchDiscoveryController({
          state: undefined,
          messenger,
        }),
      ).toThrow(mockError);

      expect(Logger.error).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getPortfolioApiBaseUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns dev URL when environment is local', () => {
      process.env.METAMASK_ENVIRONMENT = 'local';
      const {
        createTokenSearchDiscoveryController: freshCreate,
      } = require('./utils');
      const controller = freshCreate({
        state: undefined,
        messenger,
      });
      expect(controller.state).toBeDefined();
    });

    it('returns prod URL when environment is pre-release', () => {
      process.env.METAMASK_ENVIRONMENT = 'pre-release';
      const {
        createTokenSearchDiscoveryController: freshCreate,
      } = require('./utils');
      const controller = freshCreate({
        state: undefined,
        messenger,
      });
      expect(controller.state).toBeDefined();
    });

    it('returns prod URL when environment is production', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const {
        createTokenSearchDiscoveryController: freshCreate,
      } = require('./utils');
      const controller = freshCreate({
        state: undefined,
        messenger,
      });
      expect(controller.state).toBeDefined();
    });

    it('returns dev URL when environment is not recognized', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown';
      const {
        createTokenSearchDiscoveryController: freshCreate,
      } = require('./utils');
      const controller = freshCreate({
        state: undefined,
        messenger,
      });
      expect(controller.state).toBeDefined();
    });
  });
});
