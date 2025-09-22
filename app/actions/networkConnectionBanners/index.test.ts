import {
  showSlowRpcConnectionBanner,
  hideSlowRpcConnectionBanner,
  NetworkConnectionBannersActionType,
} from '.';

describe('networkConnectionBanners', () => {
  describe('NetworkConnectionBannersActionType', () => {
    it('should have correct action type values', () => {
      expect(
        NetworkConnectionBannersActionType.SHOW_SLOW_RPC_CONNECTION_BANNER,
      ).toBe('SHOW_SLOW_RPC_CONNECTION_BANNER');
      expect(
        NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER,
      ).toBe('HIDE_SLOW_RPC_CONNECTION_BANNER');
    });
  });

  describe('showSlowRpcConnectionBanner', () => {
    it('should create an action to show the network connection banner with valid chainId', () => {
      const chainId = '0x1';

      expect(showSlowRpcConnectionBanner(chainId)).toEqual({
        type: NetworkConnectionBannersActionType.SHOW_SLOW_RPC_CONNECTION_BANNER,
        chainId,
      });
    });
  });

  describe('hideSlowRpcConnectionBanner', () => {
    it('should create an action to hide the network connection banner', () => {
      expect(hideSlowRpcConnectionBanner()).toEqual({
        type: NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER,
      });
    });

    it('should not include chainId property in hide action', () => {
      const action = hideSlowRpcConnectionBanner();

      expect(action).toEqual({
        type: NetworkConnectionBannersActionType.HIDE_SLOW_RPC_CONNECTION_BANNER,
      });
      expect(Object.keys(action)).toEqual(['type']);
    });
  });
});
