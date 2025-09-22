import {
  showSlowRpcConnectionBanner,
  hideSlowRpcConnectionBanner,
} from '../../actions/networkConnectionBanners';

import reducer, { NetworkConnectionBannersState } from '.';

const initialState: Readonly<NetworkConnectionBannersState> = {
  visible: false,
  chainId: undefined,
};

describe('networkConnectionBanners reducer', () => {
  describe('default case', () => {
    it('should return the initial state', () => {
      // @ts-expect-error - null is not a valid action type
      expect(reducer(undefined, { type: null })).toStrictEqual(initialState);
    });

    it('should return current state for unknown action types', () => {
      const existingState = {
        visible: true,
        chainId: '0x1',
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
    it('should show banner with chainId when action is dispatched', () => {
      const chainId = '0x1';
      const action = showSlowRpcConnectionBanner(chainId);

      const result = reducer(initialState, action);

      expect(result).toStrictEqual({
        visible: true,
        chainId,
      });
    });

    it('should update existing state when banner is already visible', () => {
      const existingState = {
        visible: true,
        chainId: '0x1',
      } as const;

      const newChainId = '0x89';
      const action = showSlowRpcConnectionBanner(newChainId);

      const result = reducer(existingState, action);

      expect(result).toStrictEqual({
        visible: true,
        chainId: newChainId,
      });
    });
  });

  describe('HIDE_SLOW_RPC_CONNECTION_BANNER', () => {
    it('should hide banner and clear chainId when action is dispatched', () => {
      const existingState = {
        visible: true,
        chainId: '0x1',
      } as const;
      const action = hideSlowRpcConnectionBanner();

      const result = reducer(existingState, action);

      expect(result).toStrictEqual({
        visible: false,
        chainId: undefined,
      });
    });

    it('should maintain hidden state when banner is already hidden', () => {
      const action = hideSlowRpcConnectionBanner();

      const result = reducer(initialState, action);

      expect(result).toStrictEqual(initialState);
    });
  });

  describe('state transitions', () => {
    it('should handle complete show-hide cycle', () => {
      const chainId = '0x89';
      const showAction = showSlowRpcConnectionBanner(chainId);
      const hideAction = hideSlowRpcConnectionBanner();

      const afterShow = reducer(initialState, showAction);

      expect(afterShow).toStrictEqual({
        visible: true,
        chainId,
      });

      const afterHide = reducer(afterShow, hideAction);

      expect(afterHide).toStrictEqual({
        visible: false,
        chainId: undefined,
      });
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = {
        visible: true,
        chainId: '0x1',
      } as const;
      const action = hideSlowRpcConnectionBanner();

      const result = reducer(originalState, action);

      expect(result).not.toBe(originalState);
      expect(originalState).toStrictEqual({
        visible: true,
        chainId: '0x1',
      });
    });

    it('should return new state object for show action', () => {
      const action = showSlowRpcConnectionBanner('0x89');

      const result = reducer(initialState, action);

      expect(result).not.toBe(initialState);
      expect(result).toStrictEqual({
        visible: true,
        chainId: '0x89',
      });
    });
  });
});
