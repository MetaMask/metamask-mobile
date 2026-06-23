/* eslint-disable @typescript-eslint/no-explicit-any */
import sdkReducer, { initialState } from './index';
import { ActionType } from '../../actions/sdk';
import { SDKState, WC2VerifyValidation } from '../../actions/sdk/state';
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

  const channelId = 'pairing-topic-1';
  const otherChannelId = 'pairing-topic-2';
  const mockWC2SessionMetadata = {
    url: 'https://dapp.com',
    name: 'Test DApp',
    icon: 'https://dapp.com/icon.png',
  };

  it('should return initial state', () => {
    expect(sdkReducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(
      initialState,
    );
  });

  describe('SET_WC2_SESSION_METADATA', () => {
    it('inserts a per-channel entry on an empty map', () => {
      const action = {
        type: ActionType.SET_WC2_SESSION_METADATA as const,
        channelId,
        metadata: mockWC2SessionMetadata,
      };

      const result = sdkReducer(initialState, action);
      expect(result.wc2SessionMetadata[channelId]).toEqual(
        mockWC2SessionMetadata,
      );
    });

    it('overwrites an existing entry without touching siblings', () => {
      const stateWithExisting: SDKState = {
        ...initialState,
        wc2SessionMetadata: {
          [otherChannelId]: { url: 'u', name: 'n', icon: 'i' },
          [channelId]: { url: 'old', name: 'old', icon: 'old' },
        },
      };

      const action = {
        type: ActionType.SET_WC2_SESSION_METADATA as const,
        channelId,
        metadata: mockWC2SessionMetadata,
      };

      const result = sdkReducer(stateWithExisting, action);
      expect(result.wc2SessionMetadata[channelId]).toEqual(
        mockWC2SessionMetadata,
      );
      expect(result.wc2SessionMetadata[otherChannelId]).toEqual({
        url: 'u',
        name: 'n',
        icon: 'i',
      });
    });

    it('stores verifyContext alongside the metadata', () => {
      const metadataWithVerify = {
        ...mockWC2SessionMetadata,
        verifyContext: {
          isScam: true,
          validation: WC2VerifyValidation.INVALID,
          verifiedOrigin: 'https://malicious-dapp.com',
        },
      };

      const action = {
        type: ActionType.SET_WC2_SESSION_METADATA as const,
        channelId,
        metadata: metadataWithVerify,
      };

      const result = sdkReducer(initialState, action);
      expect(result.wc2SessionMetadata[channelId]).toEqual(metadataWithVerify);
      expect(
        result.wc2SessionMetadata[channelId].verifyContext?.isScam,
      ).toBe(true);
      expect(
        result.wc2SessionMetadata[channelId].verifyContext?.validation,
      ).toBe('INVALID');
      expect(
        result.wc2SessionMetadata[channelId].verifyContext?.verifiedOrigin,
      ).toBe('https://malicious-dapp.com');
    });
  });

  describe('UPDATE_WC2_SESSION_METADATA', () => {
    it('shallow-merges into an existing entry', () => {
      const stateWithExisting: SDKState = {
        ...initialState,
        wc2SessionMetadata: { [channelId]: mockWC2SessionMetadata },
      };

      const action = {
        type: ActionType.UPDATE_WC2_SESSION_METADATA as const,
        channelId,
        metadata: { lastVerifiedUrl: 'https://verified.example' },
      };

      const result = sdkReducer(stateWithExisting, action);
      expect(result.wc2SessionMetadata[channelId]).toEqual({
        ...mockWC2SessionMetadata,
        lastVerifiedUrl: 'https://verified.example',
      });
    });

    it('no-ops when the entry does not exist', () => {
      const action = {
        type: ActionType.UPDATE_WC2_SESSION_METADATA as const,
        channelId,
        metadata: { lastVerifiedUrl: 'https://verified.example' },
      };

      const result = sdkReducer(initialState, action);
      expect(result).toBe(initialState);
      expect(result.wc2SessionMetadata[channelId]).toBeUndefined();
    });

    it('does not affect sibling entries', () => {
      const sibling = { url: 'u', name: 'n', icon: 'i' };
      const stateWithExisting: SDKState = {
        ...initialState,
        wc2SessionMetadata: {
          [channelId]: mockWC2SessionMetadata,
          [otherChannelId]: sibling,
        },
      };

      const action = {
        type: ActionType.UPDATE_WC2_SESSION_METADATA as const,
        channelId,
        metadata: { lastVerifiedUrl: 'https://verified.example' },
      };

      const result = sdkReducer(stateWithExisting, action);
      expect(result.wc2SessionMetadata[otherChannelId]).toBe(sibling);
    });
  });

  describe('REMOVE_WC2_SESSION_METADATA', () => {
    it('removes an existing entry without touching siblings', () => {
      const sibling = { url: 'u', name: 'n', icon: 'i' };
      const stateWithExisting: SDKState = {
        ...initialState,
        wc2SessionMetadata: {
          [channelId]: mockWC2SessionMetadata,
          [otherChannelId]: sibling,
        },
      };

      const action = {
        type: ActionType.REMOVE_WC2_SESSION_METADATA as const,
        channelId,
      };

      const result = sdkReducer(stateWithExisting, action);
      expect(result.wc2SessionMetadata[channelId]).toBeUndefined();
      expect(result.wc2SessionMetadata[otherChannelId]).toBe(sibling);
    });

    it('no-ops when the entry is already absent', () => {
      const action = {
        type: ActionType.REMOVE_WC2_SESSION_METADATA as const,
        channelId,
      };

      const result = sdkReducer(initialState, action);
      expect(result).toBe(initialState);
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
