import networkOnboardReducer, { initialState } from '.';
import { SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID } from '../../actions/sendFlow';

type NetworkOnboardState = Omit<typeof initialState, 'sendFlowChainId'> & {
  sendFlowChainId: string | null | undefined;
};

describe('networkOnboardReducer', () => {
  it('returns the initial state when no action is provided', () => {
    const state = networkOnboardReducer(undefined, {} as never);
    expect(state).toEqual(initialState);
  });

  it('returns the initial state for unhandled action types', () => {
    const action = { type: 'UNKNOWN_ACTION', payload: 'test' } as never;
    const state = networkOnboardReducer(initialState, action);
    expect(state).toEqual(initialState);
  });

  describe('SHOW_NETWORK_ONBOARDING action', () => {
    it('handles SHOW_NETWORK_ONBOARDING action with all parameters', () => {
      const action = {
        type: 'SHOW_NETWORK_ONBOARDING',
        showNetworkOnboarding: true,
        nativeToken: 'ETH',
        networkType: 'mainnet',
        networkUrl: 'https://mainnet.infura.io',
      } as const;

      const state = networkOnboardReducer(initialState, action as never);

      expect(state).toEqual({
        ...initialState,
        networkState: {
          showNetworkOnboarding: true,
          nativeToken: 'ETH',
          networkType: 'mainnet',
          networkUrl: 'https://mainnet.infura.io',
        },
      });
    });

    it('handles SHOW_NETWORK_ONBOARDING action with partial parameters', () => {
      const action = {
        type: 'SHOW_NETWORK_ONBOARDING',
        showNetworkOnboarding: false,
        nativeToken: '',
        networkType: '',
        networkUrl: '',
      } as const;

      const state = networkOnboardReducer(initialState, action as never);

      expect(state).toEqual({
        ...initialState,
        networkState: {
          showNetworkOnboarding: false,
          nativeToken: '',
          networkType: '',
          networkUrl: '',
        },
      });
    });

    it('preserves other state properties when handling SHOW_NETWORK_ONBOARDING', () => {
      const existingState = {
        ...initialState,
        networkOnboardedState: { '0x1': true },
        switchedNetwork: {
          networkUrl: 'https://existing.network',
          networkStatus: true,
        },
      };

      const action = {
        type: 'SHOW_NETWORK_ONBOARDING',
        showNetworkOnboarding: true,
        nativeToken: 'MATIC',
        networkType: 'polygon',
        networkUrl: 'https://polygon-rpc.com',
      } as const;

      const state = networkOnboardReducer(existingState, action as never);

      expect(state.networkOnboardedState).toEqual({ '0x1': true });
      expect(state.switchedNetwork).toEqual({
        networkUrl: 'https://existing.network',
        networkStatus: true,
      });
    });
  });

  describe('NETWORK_SWITCHED action', () => {
    it('handles NETWORK_SWITCHED action with true status', () => {
      const action = {
        type: 'NETWORK_SWITCHED',
        networkUrl: 'https://polygon-rpc.com',
        networkStatus: true,
      } as const;

      const state = networkOnboardReducer(initialState, action as never);

      expect(state).toEqual({
        ...initialState,
        switchedNetwork: {
          networkUrl: 'https://polygon-rpc.com',
          networkStatus: true,
        },
      });
    });

    it('handles NETWORK_SWITCHED action with false status', () => {
      const action = {
        type: 'NETWORK_SWITCHED',
        networkUrl: 'https://failed-network.com',
        networkStatus: false,
      } as const;

      const state = networkOnboardReducer(initialState, action as never);

      expect(state).toEqual({
        ...initialState,
        switchedNetwork: {
          networkUrl: 'https://failed-network.com',
          networkStatus: false,
        },
      });
    });

    it('preserves other state properties when handling NETWORK_SWITCHED', () => {
      const existingState = {
        ...initialState,
        networkOnboardedState: { '0x89': true },
        networkState: {
          showNetworkOnboarding: true,
          nativeToken: 'MATIC',
          networkType: 'polygon',
          networkUrl: 'https://polygon.network',
        },
      };

      const action = {
        type: 'NETWORK_SWITCHED',
        networkUrl: 'https://new-network.com',
        networkStatus: true,
      } as const;

      const state = networkOnboardReducer(existingState, action as never);

      expect(state.networkOnboardedState).toEqual({ '0x89': true });
      expect(state.networkState).toEqual({
        showNetworkOnboarding: true,
        nativeToken: 'MATIC',
        networkType: 'polygon',
        networkUrl: 'https://polygon.network',
      });
    });
  });

  describe('NETWORK_ONBOARDED action', () => {
    it('handles NETWORK_ONBOARDED action with new network', () => {
      const action = {
        type: 'NETWORK_ONBOARDED',
        payload: '0x89',
      } as const;

      const state = networkOnboardReducer(initialState, action as never);

      expect(state).toEqual({
        ...initialState,
        networkState: {
          showNetworkOnboarding: false,
          nativeToken: '',
          networkType: '',
          networkUrl: '',
        },
        networkOnboardedState: {
          '0x89': true,
        },
      });
    });

    it('adds to existing onboarded networks', () => {
      const existingState = {
        ...initialState,
        networkOnboardedState: {
          '0x1': true,
          '0xa': true,
        },
      };

      const action = {
        type: 'NETWORK_ONBOARDED',
        payload: '0x89',
      } as const;

      const state = networkOnboardReducer(existingState, action as never);

      expect(state.networkOnboardedState).toEqual({
        '0x1': true,
        '0xa': true,
        '0x89': true,
      });
    });

    it('can overwrite existing onboarded network', () => {
      const existingState = {
        ...initialState,
        networkOnboardedState: {
          '0x1': false,
        },
      };

      const action = {
        type: 'NETWORK_ONBOARDED',
        payload: '0x1',
      } as const;

      const state = networkOnboardReducer(existingState, action as never);

      expect(state.networkOnboardedState).toEqual({
        '0x1': true,
      });
    });

    it('resets networkState when handling NETWORK_ONBOARDED', () => {
      const existingState = {
        ...initialState,
        networkState: {
          showNetworkOnboarding: true,
          nativeToken: 'ETH',
          networkType: 'mainnet',
          networkUrl: 'https://mainnet.infura.io',
        },
      };

      const action = {
        type: 'NETWORK_ONBOARDED',
        payload: '0x1',
      } as const;

      const state = networkOnboardReducer(existingState, action as never);

      expect(state.networkState).toEqual({
        showNetworkOnboarding: false,
        nativeToken: '',
        networkType: '',
        networkUrl: '',
      });
    });
  });

  describe('SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID action', () => {
    it('handles SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID action with chainId', () => {
      const action = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId: '0x1',
      } as const;

      const state = networkOnboardReducer(initialState, action as never);

      expect(state).toEqual({
        ...initialState,
        sendFlowChainId: '0x1',
      });
    });

    it('handles SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID action with null chainId', () => {
      const existingState: NetworkOnboardState = {
        ...initialState,
        sendFlowChainId: '0x89',
      };

      const action = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId: null,
      } as const;

      const state = networkOnboardReducer(
        existingState as typeof initialState,
        action as never,
      );

      expect(state).toEqual({
        ...initialState,
        sendFlowChainId: null,
      });
    });

    it('handles SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID action with undefined chainId', () => {
      const existingState: NetworkOnboardState = {
        ...initialState,
        sendFlowChainId: '0x89',
      };

      const action = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId: undefined,
      } as const;

      const state = networkOnboardReducer(
        existingState as typeof initialState,
        action as never,
      );

      expect(state).toEqual({
        ...initialState,
        sendFlowChainId: undefined,
      });
    });

    it('preserves other state properties when setting chainId', () => {
      const existingState = {
        ...initialState,
        networkOnboardedState: { '0x1': true },
        networkState: {
          showNetworkOnboarding: true,
          nativeToken: 'ETH',
          networkType: 'mainnet',
          networkUrl: 'https://mainnet.infura.io',
        },
        switchedNetwork: {
          networkUrl: 'https://polygon.network',
          networkStatus: true,
        },
      };

      const action = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId: '0xa',
      } as const;

      const state = networkOnboardReducer(existingState, action as never);

      expect(state.networkOnboardedState).toEqual({ '0x1': true });
      expect(state.networkState).toEqual({
        showNetworkOnboarding: true,
        nativeToken: 'ETH',
        networkType: 'mainnet',
        networkUrl: 'https://mainnet.infura.io',
      });
      expect(state.switchedNetwork).toEqual({
        networkUrl: 'https://polygon.network',
        networkStatus: true,
      });
      expect(state.sendFlowChainId).toBe('0xa');
    });
  });

  describe('Edge cases and default parameters', () => {
    it('handles action with no parameters using defaults', () => {
      const state = networkOnboardReducer(initialState, undefined as never);
      expect(state).toEqual(initialState);
    });

    it('maintains immutability when updating state', () => {
      const action = {
        type: 'SHOW_NETWORK_ONBOARDING',
        showNetworkOnboarding: true,
        nativeToken: 'ETH',
        networkType: 'mainnet',
        networkUrl: 'https://mainnet.infura.io',
      } as const;

      const stateBefore = { ...initialState };
      const stateAfter = networkOnboardReducer(initialState, action as never);

      expect(stateBefore).toEqual(initialState);
      expect(stateAfter).not.toBe(initialState);
    });
  });
});
