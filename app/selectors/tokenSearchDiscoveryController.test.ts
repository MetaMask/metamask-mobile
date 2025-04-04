import { RootState } from '../reducers';
import { selectRecentTokenSearches } from './tokenSearchDiscoveryController';

describe('Token Search Discovery Controller Selectors', () => {
  const mockRecentSearches = ['ETH', 'USDC', 'DAI'];

  const mockState = {
    engine: {
      backgroundState: {
        TokenSearchDiscoveryController: {
          recentSearches: mockRecentSearches,
        },
      },
    },
  } as unknown as RootState;

  describe('selectRecentTokenSearches', () => {
    it('returns recent token searches from state', () => {
      expect(selectRecentTokenSearches(mockState)).toEqual(mockRecentSearches);
    });

    it('returns empty array when no recent searches exist', () => {
      const stateWithoutSearches = {
        engine: {
          backgroundState: {
            TokenSearchDiscoveryController: {
              recentSearches: [],
            },
          },
        },
      } as unknown as RootState;

      expect(selectRecentTokenSearches(stateWithoutSearches)).toEqual([]);
    });

    it('returns empty array when TokenSearchDiscoveryController is not initialized', () => {
      const stateWithoutController = {
        engine: {
          backgroundState: {},
        },
      } as unknown as RootState;

      expect(selectRecentTokenSearches(stateWithoutController)).toEqual([]);
    });
  });
});
