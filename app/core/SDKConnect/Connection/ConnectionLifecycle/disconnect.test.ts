import { MessageType } from '@metamask/sdk-communication-layer';
import {
  getOriginProvenance,
  removeOriginProvenance,
  RemoteTransport,
  stampOriginProvenance,
} from '../../../OriginProvenance';
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
    await disconnect({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

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

  describe('origin provenance', () => {
    const stampTestProvenance = () =>
      stampOriginProvenance({
        connectionId: 'testChannelId',
        transport: RemoteTransport.SDKv1,
        selfReported: { url: 'https://example.com' },
      });

    afterEach(() => {
      removeOriginProvenance('testChannelId');
    });

    it('drops the provenance stamped in setupBridge when the connection terminates', async () => {
      stampTestProvenance();

      await disconnect({ instance: mockConnection, terminate: true });

      expect(getOriginProvenance('testChannelId')).toBeUndefined();
    });

    it('keeps the provenance when termination fails so a retry can still find it', async () => {
      stampTestProvenance();
      mockRemoteSendMessage.mockResolvedValue(false);

      await disconnect({ instance: mockConnection, terminate: true });

      expect(getOriginProvenance('testChannelId')).toBeDefined();
    });

    it('keeps the provenance on non-terminal disconnects because the connection can resume', async () => {
      stampTestProvenance();

      await disconnect({ instance: mockConnection, terminate: false });

      expect(getOriginProvenance('testChannelId')).toBeDefined();
    });
  });

  it('should return the terminated status', async () => {
    const result = await disconnect({
      instance: mockConnection,
      terminate: true,
    });
    expect(result).toBe(true);

    mockRemoteSendMessage.mockResolvedValue(false);
    const falseResult = await disconnect({
      instance: mockConnection,
      terminate: true,
    });
    expect(falseResult).toBe(false);
  });
});
