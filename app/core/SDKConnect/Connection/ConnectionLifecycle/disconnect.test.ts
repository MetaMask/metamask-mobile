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

    mockRemoteSendMessage.mockResolvedValue(true);

    mockConnection = {
      channelId: 'testChannelId',
      remote: {
        sendMessage: mockRemoteSendMessage,
        disconnect: mockRemoteDisconnect,
      },
      receivedClientsReady: true,
    } as unknown as Connection;
  });

  it('should log the disconnect action with channel ID, context, and terminate flag', async () => {
    await disconnect({ instance: mockConnection, terminate: true, context: 'test' });

    expect(DevLogger.log).toHaveBeenCalledTimes(3);
    expect(DevLogger.log).toHaveBeenNthCalledWith(
      1,
      `Connection::disconnect() context=test id=testChannelId terminate=true`,
    );
    expect(DevLogger.log).toHaveBeenNthCalledWith(
      2,
      `Connection::disconnect() context=test id=testChannelId terminate=true sending terminate`,
    );
    expect(DevLogger.log).toHaveBeenNthCalledWith(
      3,
      `Connection::disconnect() context=test id=testChannelId terminate=true sent terminate=true`,
    );
  });

  it('should reset receivedClientsReady to false', async () => {
    await disconnect({ instance: mockConnection, terminate: true });

    expect(mockConnection.receivedClientsReady).toBe(false);
  });

  describe('When terminate is true', () => {
    it('should send a TERMINATE message to the remote', async () => {
      await disconnect({ instance: mockConnection, terminate: true });

      expect(mockRemoteSendMessage).toHaveBeenCalledTimes(1);
      expect(mockRemoteSendMessage).toHaveBeenCalledWith({
        type: MessageType.TERMINATE,
      });
    });

    it('should call disconnect on the remote when terminated successfully', async () => {
      await disconnect({ instance: mockConnection, terminate: true });

      expect(mockRemoteDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should not call disconnect on the remote when termination fails', async () => {
      mockRemoteSendMessage.mockResolvedValue(false);
      await disconnect({ instance: mockConnection, terminate: true });

      expect(mockRemoteDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('When terminate is false', () => {
    it('should not send a TERMINATE message to the remote', async () => {
      await disconnect({ instance: mockConnection, terminate: false });

      expect(mockRemoteSendMessage).not.toHaveBeenCalled();
    });

    it('should not call disconnect on the remote', async () => {
      await disconnect({ instance: mockConnection, terminate: false });

      expect(mockRemoteDisconnect).not.toHaveBeenCalled();
    });
  });

  it('should return the terminated status', async () => {
    const result = await disconnect({ instance: mockConnection, terminate: true });
    expect(result).toBe(true);

    mockRemoteSendMessage.mockResolvedValue(false);
    const falseResult = await disconnect({ instance: mockConnection, terminate: true });
    expect(falseResult).toBe(false);
  });
});
