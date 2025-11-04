import {
  ActionType,
  disconnectAll,
  updateWC2Metadata,
  updateConnection,
  removeConnection,
  addConnection,
  resetConnections,
  removeApprovedHost,
  setApprovedHost,
  resetApprovedHosts,
  updateDappConnection,
  removeDappConnection,
  resetDappConnections,
  setConnected,
  setSdkV2Connections,
} from './index';
import { ConnectionProps } from '../../core/SDKConnect/Connection';
import { ApprovedHosts, SDKSessions } from '../../core/SDKConnect/SDKConnect';

describe('SDK Actions', () => {
  it('creates disconnectAll action', () => {
    const action = disconnectAll();

    expect(action).toEqual({
      type: ActionType.DISCONNECT_ALL,
    });
  });

  it('creates updateWC2Metadata action', () => {
    const metadata = {
      id: 'test-id',
      name: 'test',
      url: 'https://test.com',
      icon: 'https://test.com/icon.png',
    };
    const action = updateWC2Metadata(metadata);

    expect(action).toEqual({
      type: ActionType.WC2_METADATA,
      metadata,
    });
  });

  it('creates updateConnection action', () => {
    const channelId = 'channel1';
    const connection = {} as ConnectionProps;
    const action = updateConnection(channelId, connection);

    expect(action).toEqual({
      type: ActionType.UPDATE_CONNECTION,
      channelId,
      connection,
    });
  });

  it('creates removeConnection action', () => {
    const channelId = 'channel1';
    const action = removeConnection(channelId);

    expect(action).toEqual({
      type: ActionType.REMOVE_CONNECTION,
      channelId,
    });
  });

  it('creates addConnection action', () => {
    const channelId = 'channel1';
    const connection = {} as ConnectionProps;
    const action = addConnection(channelId, connection);

    expect(action).toEqual({
      type: ActionType.ADD_CONNECTION,
      channelId,
      connection,
    });
  });

  it('creates resetConnections action', () => {
    const connections = {} as SDKSessions;
    const action = resetConnections(connections);

    expect(action).toEqual({
      type: ActionType.RESET_CONNECTIONS,
      connections,
    });
  });

  it('creates removeApprovedHost action', () => {
    const channelId = 'channel1';
    const action = removeApprovedHost(channelId);

    expect(action).toEqual({
      type: ActionType.REMOVE_APPROVED_HOST,
      channelId,
    });
  });

  it('creates setApprovedHost action', () => {
    const channelId = 'channel1';
    const validUntil = Date.now() + 3600000;
    const action = setApprovedHost(channelId, validUntil);

    expect(action).toEqual({
      type: ActionType.SET_APPROVED_HOST,
      channelId,
      validUntil,
    });
  });

  it('creates resetApprovedHosts action', () => {
    const approvedHosts = {} as ApprovedHosts;
    const action = resetApprovedHosts(approvedHosts);

    expect(action).toEqual({
      type: ActionType.RESET_APPROVED_HOSTS,
      approvedHosts,
    });
  });

  it('creates updateDappConnection action', () => {
    const channelId = 'channel1';
    const connection = {} as ConnectionProps;
    const action = updateDappConnection(channelId, connection);

    expect(action).toEqual({
      type: ActionType.UPDATE_DAPP_CONNECTION,
      channelId,
      connection,
    });
  });

  it('creates removeDappConnection action', () => {
    const channelId = 'channel1';
    const action = removeDappConnection(channelId);

    expect(action).toEqual({
      type: ActionType.REMOVE_DAPP_CONNECTION,
      channelId,
    });
  });

  it('creates resetDappConnections action', () => {
    const connections = {} as SDKSessions;
    const action = resetDappConnections(connections);

    expect(action).toEqual({
      type: ActionType.RESET_DAPP_CONNECTIONS,
      connections,
    });
  });

  it('creates setConnected action', () => {
    const channelId = 'channel1';
    const connected = true;
    const action = setConnected(channelId, connected);

    expect(action).toEqual({
      type: ActionType.SET_CONNECTED,
      channelId,
      connected,
    });
  });

  it('creates setSdkV2Connections action', () => {
    const connections = {} as SDKSessions;
    const action = setSdkV2Connections(connections);

    expect(action).toEqual({
      type: ActionType.SET_SDK_V2_CONNECTIONS,
      connections,
    });
  });
});
