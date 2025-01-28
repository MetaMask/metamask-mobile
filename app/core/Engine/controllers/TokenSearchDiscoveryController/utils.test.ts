import { createTokenSearchDiscoveryController } from './utils';
import { ControllerMessenger } from '@metamask/base-controller';
import {
  TokenSearchDiscoveryControllerMessenger,
  TokenSearchDiscoveryControllerState,
} from '@metamask/token-search-discovery-controller/dist/token-search-discovery-controller.cjs';

describe('TokenSearchDiscoveryController utils', () => {
  let messenger: TokenSearchDiscoveryControllerMessenger;

  beforeEach(() => {
    messenger =
      new ControllerMessenger() as unknown as TokenSearchDiscoveryControllerMessenger;
  });

  describe('createTokenSearchDiscoveryController', () => {
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
  });
});
