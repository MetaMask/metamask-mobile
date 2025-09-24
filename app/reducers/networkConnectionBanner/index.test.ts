import {
  showNetworkConnectionBanner,
  hideNetworkConnectionBanner,
} from '../../actions/networkConnectionBanner';

import reducer, { NetworkConnectionBannerState } from '.';

const initialState: Readonly<NetworkConnectionBannerState> = {
  visible: false,
};

describe('networkConnectionBanner reducer', () => {
  describe('default case', () => {
    it('should return the initial state', () => {
      // @ts-expect-error - null is not a valid action type
      expect(reducer(undefined, { type: null })).toStrictEqual(initialState);
    });

    it('should return current state for unknown action types', () => {
      const existingState = {
        visible: true,
        chainId: '0x1',
        status: 'slow',
      } as const;
      const unknownAction = {
        type: 'UNKNOWN_ACTION_TYPE',
      } as const;

      // @ts-expect-error - unknownAction is not a valid action
      const result = reducer(existingState, unknownAction);

      expect(result).toStrictEqual(existingState);
    });

    it('should return initial state for unknown action when state is undefined', () => {
      const unknownAction = {
        type: 'UNKNOWN_ACTION_TYPE',
      } as const;

      // @ts-expect-error - unknownAction is not a valid action
      const result = reducer(undefined, unknownAction);

      expect(result).toStrictEqual(initialState);
    });
  });

  describe('SHOW_SLOW_RPC_CONNECTION_BANNER', () => {
    it('should show banner with chainId and status when action is dispatched', () => {
      const chainId = '0x1';
      const action = showNetworkConnectionBanner({
        chainId,
        status: 'slow',
      });

      const result = reducer(initialState, action);

      expect(result).toStrictEqual({
        visible: true,
        chainId,
        status: 'slow',
      });
    });

    it('should update existing state when banner is already visible with chainId and status', () => {
      const existingState = {
        visible: true,
        chainId: '0x1',
        status: 'slow',
      } as const;

      const newChainId = '0x89';
      const action = showNetworkConnectionBanner({
        chainId: newChainId,
        status: 'slow',
      });

      const result = reducer(existingState, action);

      expect(result).toStrictEqual({
        visible: true,
        chainId: newChainId,
        status: 'slow',
      });
    });
  });

  describe('HIDE_SLOW_RPC_CONNECTION_BANNER', () => {
    it('should hide banner and clear chainId and status when action is dispatched', () => {
      const existingState = {
        visible: true,
        chainId: '0x1',
        status: 'slow',
      } as const;
      const action = hideNetworkConnectionBanner();

      const result = reducer(existingState, action);

      expect(result).toStrictEqual({
        visible: false,
      });
    });

    it('should maintain hidden state when banner is already hidden', () => {
      const action = hideNetworkConnectionBanner();

      const result = reducer(initialState, action);

      expect(result).toStrictEqual(initialState);
    });
  });

  describe('state transitions', () => {
    it('should handle complete show-hide cycle', () => {
      const chainId = '0x89';
      const showAction = showNetworkConnectionBanner({
        chainId,
        status: 'slow',
      });
      const hideAction = hideNetworkConnectionBanner();

      const afterShow = reducer(initialState, showAction);

      expect(afterShow).toStrictEqual({
        visible: true,
        chainId,
        status: 'slow',
      });

      const afterHide = reducer(afterShow, hideAction);

      expect(afterHide).toStrictEqual({
        visible: false,
      });
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = {
        visible: true,
        chainId: '0x1',
        status: 'slow',
      } as const;
      const action = hideNetworkConnectionBanner();

      const result = reducer(originalState, action);

      expect(result).not.toBe(originalState);
      expect(originalState).toStrictEqual({
        visible: true,
        chainId: '0x1',
        status: 'slow',
      });
    });

    it('should return new state object for show action', () => {
      const action = showNetworkConnectionBanner({
        chainId: '0x89',
        status: 'slow',
      });

      const result = reducer(initialState, action);

      expect(result).not.toBe(initialState);
      expect(result).toStrictEqual({
        visible: true,
        chainId: '0x89',
        status: 'slow',
      });
    });
  });
});
