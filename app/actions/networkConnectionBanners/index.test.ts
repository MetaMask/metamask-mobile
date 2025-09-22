import {
  showNetworkConnectionBanner,
  hideNetworkConnectionBanner,
  NetworkConnectionBannersActionType,
} from '.';
import { NetworkConnectionBannerStatus } from '../../components/UI/NetworkConnectionBanner/types';

describe('networkConnectionBanners', () => {
  describe('NetworkConnectionBannersActionType', () => {
    it('should have correct action type values', () => {
      expect(
        NetworkConnectionBannersActionType.SHOW_NETWORK_CONNECTION_BANNER,
      ).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(
        NetworkConnectionBannersActionType.HIDE_NETWORK_CONNECTION_BANNER,
      ).toBe('HIDE_NETWORK_CONNECTION_BANNER');
    });
  });

  describe('showNetworkConnectionBanner', () => {
    it('should create an action to show the network connection banner with valid chainId and slow status', () => {
      const chainId = '0x1';

      expect(
        showNetworkConnectionBanner({
          chainId,
          status: 'slow',
        }),
      ).toStrictEqual({
        type: NetworkConnectionBannersActionType.SHOW_NETWORK_CONNECTION_BANNER,
        chainId,
        status: 'slow',
      });
    });

    it('should create an action to show the network connection banner with valid chainId and unavailable status', () => {
      const chainId = '0x89';

      expect(
        showNetworkConnectionBanner({
          chainId,
          status: 'unavailable',
        }),
      ).toStrictEqual({
        type: NetworkConnectionBannersActionType.SHOW_NETWORK_CONNECTION_BANNER,
        chainId,
        status: 'unavailable',
      });
    });

    it('should require both chainId and status parameters', () => {
      const chainId = '0x1';
      const status: NetworkConnectionBannerStatus = 'slow';

      const action = showNetworkConnectionBanner({ chainId, status });

      expect(action.chainId).toBe(chainId);
      expect(action.status).toBe(status);
      expect(Object.keys(action)).toEqual(['type', 'chainId', 'status']);
    });
  });

  describe('hideNetworkConnectionBanner', () => {
    it('should create an action to hide the network connection banner', () => {
      expect(hideNetworkConnectionBanner()).toStrictEqual({
        type: NetworkConnectionBannersActionType.HIDE_NETWORK_CONNECTION_BANNER,
      });
    });

    it('should not include chainId property in hide action', () => {
      const action = hideNetworkConnectionBanner();

      expect(action).toStrictEqual({
        type: NetworkConnectionBannersActionType.HIDE_NETWORK_CONNECTION_BANNER,
      });
      expect(Object.keys(action)).toStrictEqual(['type']);
    });
  });
});
