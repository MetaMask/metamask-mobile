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
        networkName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/123',
        description: 'slow status',
      },
      {
        status: 'unavailable',
        chainId: '0x89',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        description: 'unavailable status',
      },
    ])(
      'should return state with visible true and $description when banner is shown',
      ({ status, chainId, networkName, rpcUrl }) => {
        const stateWithVisibleBanner = {
          networkConnectionBanner: {
            visible: true,
            chainId,
            status,
            networkName,
            rpcUrl,
          },
        } as unknown as RootState;

        const result = selectNetworkConnectionBannerState(
          stateWithVisibleBanner,
        );

        expect(result).toStrictEqual({
          visible: true,
          chainId,
          status,
          networkName,
          rpcUrl,
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
          networkName: 'Ethereum Mainnet',
          rpcUrl: 'https://mainnet.infura.io/v3/123',
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
        networkName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/123',
      });
    });
  });
});
