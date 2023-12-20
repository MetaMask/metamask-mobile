import { MessageType } from '@metamask/sdk-communication-layer';
import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';
import disconnect from './disconnect';

jest.mock('../Connection');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('../../../../util/Logger');
jest.mock('../../utils/DevLogger');

describe('disconnect', () => {
  let mockConnection: Connection;

  const mockRemoteSendMessage = jest.fn();
  const mockRemoteDisconnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockRemoteSendMessage.mockResolvedValue(undefined);

    mockConnection = {
      channelId: 'testChannelId',
      remote: {
        sendMessage: mockRemoteSendMessage,
        disconnect: mockRemoteDisconnect,
      },
      receivedClientsReady: true,
    } as unknown as Connection;
  });

  it('should log the disconnect action with channel ID, context, and terminate flag', () => {
    disconnect({ instance: mockConnection, terminate: true, context: 'test' });

    expect(DevLogger.log).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `Connection::disconnect() context=test id=testChannelId terminate=true`,
    );
  });

  it('should reset receivedClientsReady to false', () => {
    disconnect({ instance: mockConnection, terminate: true });

    expect(mockConnection.receivedClientsReady).toBe(false);
  });

  describe('When terminate is true', () => {
    it('should send a TERMINATE message to the remote', () => {
      disconnect({ instance: mockConnection, terminate: true });

      expect(mockRemoteSendMessage).toHaveBeenCalledTimes(1);
      expect(mockRemoteSendMessage).toHaveBeenCalledWith({
        type: MessageType.TERMINATE,
      });
    });
  });

  describe('Disconnecting the remote', () => {
    it('should call disconnect on the remote', () => {
      disconnect({ instance: mockConnection, terminate: true });

      expect(mockRemoteDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('When terminate is false', () => {
    it('should not send a TERMINATE message to the remote', () => {
      disconnect({ instance: mockConnection, terminate: false });

      expect(mockRemoteSendMessage).not.toHaveBeenCalled();
    });
  });
});
