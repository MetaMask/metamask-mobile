import { selectNetworkConnectionBannerState } from './index';
import { RootState } from '../../reducers';
import { NetworkConnectionBannerState } from '../../reducers/networkConnectionBanner';

describe('networkConnectionBanner selectors', () => {
  const mockNetworkConnectionBannersState: NetworkConnectionBannerState = {
    visible: false,
  };

  const mockState = {
    networkConnectionBanner: mockNetworkConnectionBannersState,
  } as unknown as RootState;

  describe('selectNetworkConnectionBannerState', () => {
    it('should return the network connection banners state', () => {
      const result = selectNetworkConnectionBannerState(mockState);

      expect(result).toBe(mockState.networkConnectionBanner);
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
          networkConnectionBanner: {
            visible: true,
            chainId,
            status,
          },
        } as unknown as RootState;

        const result = selectNetworkConnectionBannerState(
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
        networkConnectionBanner: {
          visible: false,
        },
      } as unknown as RootState;

      const result = selectNetworkConnectionBannerState(stateWithHiddenBanner);

      expect(result).toStrictEqual({
        visible: false,
      });
    });

    it('should return the same reference when called multiple times with same state', () => {
      const result1 = selectNetworkConnectionBannerState(mockState);
      const result2 = selectNetworkConnectionBannerState(mockState);

      expect(result1).toBe(result2);
    });

    it('should return different references when state changes', () => {
      const state1 = {
        networkConnectionBanner: {
          visible: false,
        },
      } as unknown as RootState;

      const state2 = {
        networkConnectionBanner: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
      } as unknown as RootState;

      const result1 = selectNetworkConnectionBannerState(state1);
      const result2 = selectNetworkConnectionBannerState(state2);

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
