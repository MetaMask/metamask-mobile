import { selectNetworkConnectionBannersState } from './index';
import { RootState } from '../../reducers';
import { NetworkConnectionBannersState } from '../../reducers/networkConnectionBanners';

describe('networkConnectionBanners selectors', () => {
  const mockNetworkConnectionBannersState: NetworkConnectionBannersState = {
    visible: false,
  };

  const mockState = {
    networkConnectionBanners: mockNetworkConnectionBannersState,
  } as unknown as RootState;

  describe('selectNetworkConnectionBannersState', () => {
    it('should return the network connection banners state', () => {
      const result = selectNetworkConnectionBannersState(mockState);

      expect(result).toBe(mockState.networkConnectionBanners);
    });

    it.each([
      {
        status: 'slow',
        chainId: '0x1',
        description: 'slow status',
      },
      {
        status: 'unavailable',
        chainId: '0x89',
        description: 'unavailable status',
      },
    ])(
      'should return state with visible true and $description when banner is shown',
      ({ status, chainId }) => {
        const stateWithVisibleBanner = {
          networkConnectionBanners: {
            visible: true,
            chainId,
            status,
          },
        } as unknown as RootState;

        const result = selectNetworkConnectionBannersState(
          stateWithVisibleBanner,
        );

        expect(result).toStrictEqual({
          visible: true,
          chainId,
          status,
        });
      },
    );

    it('should return state with visible false when banner is hidden', () => {
      const stateWithHiddenBanner = {
        networkConnectionBanners: {
          visible: false,
        },
      } as unknown as RootState;

      const result = selectNetworkConnectionBannersState(stateWithHiddenBanner);

      expect(result).toStrictEqual({
        visible: false,
      });
    });

    it('should return the same reference when called multiple times with same state', () => {
      const result1 = selectNetworkConnectionBannersState(mockState);
      const result2 = selectNetworkConnectionBannersState(mockState);

      expect(result1).toBe(result2);
    });

    it('should return different references when state changes', () => {
      const state1 = {
        networkConnectionBanners: {
          visible: false,
        },
      } as unknown as RootState;

      const state2 = {
        networkConnectionBanners: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
      } as unknown as RootState;

      const result1 = selectNetworkConnectionBannersState(state1);
      const result2 = selectNetworkConnectionBannersState(state2);

      expect(result1).not.toBe(result2);
      expect(result1).toStrictEqual({
        visible: false,
      });
      expect(result2).toStrictEqual({
        visible: true,
        chainId: '0x1',
        status: 'slow',
      });
    });
  });
});
