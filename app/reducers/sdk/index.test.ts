/* eslint-disable @typescript-eslint/no-explicit-any */
import sdkReducer, { initialState } from './index';
import { ActionType } from '../../actions/sdk';
import { SDKState } from '../../actions/sdk/state';
import { ConnectionProps } from '../../core/SDKConnect/Connection';

describe('SDK Reducer', () => {
  const mockConnection: ConnectionProps = {
    id: 'test-channel',
    otherPublicKey: 'test-public-key',
    origin: 'https://test.com',
    originatorInfo: {
      url: 'https://test.com',
      title: 'Test DApp',
      platform: 'mobile',
      dappId: 'dapp-id',
    },
    validUntil: Date.now() + 1000000,
    lastAuthorized: Date.now(),
  };

  const mockWC2Metadata = {
    id: 'wc2-id',
    url: 'https://dapp.com',
    name: 'Test DApp',
    icon: 'https://dapp.com/icon.png',
  };

  it('should return initial state', () => {
    expect(sdkReducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(
      initialState,
    );
  });

  describe('WC2_METADATA', () => {
    it('should update wc2Metadata', () => {
      const action = {
        type: ActionType.WC2_METADATA as const,
        metadata: mockWC2Metadata,
      };

      const result = sdkReducer(initialState, action);
      expect(result.wc2Metadata).toEqual(mockWC2Metadata);
    });

    it('should clear wc2Metadata when undefined', () => {
      const stateWithMetadata: SDKState = {
        ...initialState,
        wc2Metadata: mockWC2Metadata,
      };

      const action = {
        type: ActionType.WC2_METADATA as const,
        metadata: undefined,
      };

      const result = sdkReducer(stateWithMetadata, action);
      expect(result.wc2Metadata).toBeUndefined();
    });
  });

  describe('Connection Actions', () => {
    it('should handle ADD_CONNECTION', () => {
      const action = {
        type: ActionType.ADD_CONNECTION as const,
        channelId: 'channel-1',
        connection: mockConnection,
      };

      const result = sdkReducer(initialState, action);
      expect(result.connections['channel-1']).toEqual(mockConnection);
    });

    it('should handle UPDATE_CONNECTION', () => {
      const stateWithConnection: SDKState = {
        ...initialState,
        connections: {
          'channel-1': mockConnection,
        },
      };

      const updatedConnection = { ...mockConnection, connected: true };
      const action = {
        type: ActionType.UPDATE_CONNECTION as const,
        channelId: 'channel-1',
        connection: updatedConnection,
      };

      const result = sdkReducer(stateWithConnection, action);
      expect(result.connections['channel-1']).toEqual(updatedConnection);
    });

    it('should handle REMOVE_CONNECTION', () => {
      const stateWithConnections: SDKState = {
        ...initialState,
        connections: {
          'channel-1': mockConnection,
          'channel-2': { ...mockConnection, id: 'channel-2' },
        },
      };

      const action = {
        type: ActionType.REMOVE_CONNECTION as const,
        channelId: 'channel-1',
      };

      const result = sdkReducer(stateWithConnections, action);
      expect(result.connections['channel-1']).toBeUndefined();
      expect(result.connections['channel-2']).toBeDefined();
    });

    it('should handle RESET_CONNECTIONS', () => {
      const newConnections = {
        'new-channel': mockConnection,
      };

      const action = {
        type: ActionType.RESET_CONNECTIONS as const,
        connections: newConnections,
      };

      const result = sdkReducer(initialState, action);
      expect(result.connections).toEqual(newConnections);
    });

    it('should handle SET_CONNECTED', () => {
      const stateWithConnection: SDKState = {
        ...initialState,
        connections: {
          'channel-1': mockConnection,
        },
      };

      const action = {
        type: ActionType.SET_CONNECTED as const,
        channelId: 'channel-1',
        connected: true,
      };

      const result = sdkReducer(stateWithConnection, action);
      expect(result.connections['channel-1'].connected).toBe(true);
    });

    it('should not update state if connection does not exist for SET_CONNECTED', () => {
      const action = {
        type: ActionType.SET_CONNECTED as const,
        channelId: 'non-existent',
        connected: true,
      };

      const result = sdkReducer(initialState, action);
      expect(result).toEqual(initialState);
    });

    it('should handle DISCONNECT_ALL', () => {
      const stateWithConnections: SDKState = {
        ...initialState,
        connections: {
          'channel-1': { ...mockConnection, connected: true },
          'channel-2': { ...mockConnection, id: 'channel-2', connected: true },
        },
      };

      const action = {
        type: ActionType.DISCONNECT_ALL as const,
      };

      const result = sdkReducer(stateWithConnections, action);
      expect(result.connections['channel-1'].connected).toBe(false);
      expect(result.connections['channel-2'].connected).toBe(false);
    });
  });

  describe('Approved Host Actions', () => {
    it('should handle SET_APPROVED_HOST', () => {
      const validUntil = Date.now() + 1000000;
      const action = {
        type: ActionType.SET_APPROVED_HOST as const,
        channelId: 'channel-1',
        validUntil,
      };

      const result = sdkReducer(initialState, action);
      expect(result.approvedHosts['channel-1']).toEqual(validUntil);
    });

    it('should handle REMOVE_APPROVED_HOST', () => {
      const stateWithApprovedHosts: SDKState = {
        ...initialState,
        approvedHosts: {
          'channel-1': Date.now(),
          'channel-2': Date.now(),
        },
      };

      const action = {
        type: ActionType.REMOVE_APPROVED_HOST as const,
        channelId: 'channel-1',
      };

      const result = sdkReducer(stateWithApprovedHosts, action);
      expect(result.approvedHosts['channel-1']).toBeUndefined();
      expect(result.approvedHosts['channel-2']).toBeDefined();
    });
  });

  describe('DApp Connection Actions', () => {
    it('should handle UPDATE_DAPP_CONNECTION', () => {
      const action = {
        type: ActionType.UPDATE_DAPP_CONNECTION as const,
        channelId: 'dapp-1',
        connection: mockConnection,
      };

      const result = sdkReducer(initialState, action);
      expect(result.dappConnections['dapp-1']).toEqual(mockConnection);
    });

    it('should handle REMOVE_DAPP_CONNECTION', () => {
      const stateWithDappConnections: SDKState = {
        ...initialState,
        dappConnections: {
          'dapp-1': mockConnection,
          'dapp-2': { ...mockConnection, id: 'dapp-2' },
        },
      };

      const action = {
        type: ActionType.REMOVE_DAPP_CONNECTION as const,
        channelId: 'dapp-1',
      };

      const result = sdkReducer(stateWithDappConnections, action);
      expect(result.dappConnections['dapp-1']).toBeUndefined();
      expect(result.dappConnections['dapp-2']).toBeDefined();
    });

    it('should handle RESET_DAPP_CONNECTIONS', () => {
      const newDappConnections = {
        'new-dapp': mockConnection,
      };

      const action = {
        type: ActionType.RESET_DAPP_CONNECTIONS as const,
        connections: newDappConnections,
      };

      const result = sdkReducer(initialState, action);
      expect(result.dappConnections).toEqual(newDappConnections);
    });
  });

  describe('SDK V2 Connection Actions', () => {
    it('should handle SET_SDK_V2_CONNECTIONS', () => {
      const v2Connections = {
        'v2-channel-1': mockConnection,
        'v2-channel-2': { ...mockConnection, id: 'v2-channel-2' },
      };

      const action = {
        type: ActionType.SET_SDK_V2_CONNECTIONS as const,
        connections: v2Connections,
      };

      const result = sdkReducer(initialState, action);
      expect(result.v2Connections).toEqual(v2Connections);
    });
  });

  describe('Default case', () => {
    it('should return current state for unknown action', () => {
      const currentState: SDKState = {
        ...initialState,
        connections: { test: mockConnection },
      };

      const action = { type: 'UNKNOWN_ACTION' } as any;
      const result = sdkReducer(currentState, action);
      expect(result).toEqual(currentState);
    });
  });
});
