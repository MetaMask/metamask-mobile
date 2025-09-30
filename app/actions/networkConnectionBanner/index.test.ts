import {
  showNetworkConnectionBanner,
  hideNetworkConnectionBanner,
  NetworkConnectionBannerActionType,
} from '.';
import { NetworkConnectionBannerStatus } from '../../components/UI/NetworkConnectionBanner/types';

describe('networkConnectionBanner actions', () => {
  describe('NetworkConnectionBannerActionType', () => {
    it('should have correct action type values', () => {
      expect(
        NetworkConnectionBannerActionType.SHOW_NETWORK_CONNECTION_BANNER,
      ).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(
        NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER,
      ).toBe('HIDE_NETWORK_CONNECTION_BANNER');
    });
  });

  describe('showNetworkConnectionBanner', () => {
    it.each([
      {
        chainId: '0x1',
        status: 'slow' as const,
        networkName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/123',
      },
      {
        chainId: '0x89',
        status: 'unavailable' as const,
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
      },
    ] as const)(
      'should create an action to show the network connection banner with valid chainId, status, networkName and rpcUrl for $status status',
      ({ chainId, status, networkName, rpcUrl }) => {
        expect(
          showNetworkConnectionBanner({
            chainId,
            status,
            networkName,
            rpcUrl,
          }),
        ).toStrictEqual({
          type: NetworkConnectionBannerActionType.SHOW_NETWORK_CONNECTION_BANNER,
          chainId,
          status,
          networkName,
          rpcUrl,
        });
      },
    );

    it('should require chainId, status, networkName and rpcUrl parameters', () => {
      const chainId = '0x1';
      const status: NetworkConnectionBannerStatus = 'degraded';
      const networkName = 'Ethereum Mainnet';
      const rpcUrl = 'https://mainnet.infura.io/v3/123';

      const action = showNetworkConnectionBanner({
        chainId,
        status,
        networkName,
        rpcUrl,
      });

      expect(action.chainId).toBe(chainId);
      expect(action.status).toBe(status);
      expect(action.networkName).toBe(networkName);
      expect(action.rpcUrl).toBe(rpcUrl);
      expect(Object.keys(action)).toEqual([
        'type',
        'chainId',
        'status',
        'networkName',
        'rpcUrl',
      ]);
    });
  });

  describe('hideNetworkConnectionBanner', () => {
    it('should create an action to hide the network connection banner', () => {
      expect(hideNetworkConnectionBanner()).toStrictEqual({
        type: NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER,
      });
    });

    it('should not include chainId property in hide action', () => {
      const action = hideNetworkConnectionBanner();

      expect(action).toStrictEqual({
        type: NetworkConnectionBannerActionType.HIDE_NETWORK_CONNECTION_BANNER,
      });
      expect(Object.keys(action)).toStrictEqual(['type']);
    });
  });
});
