import connect from './connect';
import { Connection } from '../Connection';
import DevLogger from '../../utils/DevLogger';

jest.mock('../Connection');
jest.mock('../../utils/DevLogger');

describe('connect', () => {
  let mockConnection: Connection;
  const mockConnectToChannel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      remote: {
        connectToChannel: mockConnectToChannel,
      },
      channelId: 'testChannelId',
      setLoading: jest.fn(),
      receivedDisconnect: false,
    } as unknown as Connection;
  });

  it('should log the connect action with channel ID and key exchange flag', () => {
    connect({
      instance: mockConnection,
      withKeyExchange: true,
      authorized: false,
    });

    expect(DevLogger.log).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `Connection::connect() id=testChannelId withKeyExchange=true authorized=false`,
    );
  });

  it('should call connectToChannel on the remote with channelId and key exchange flag', () => {
    connect({
      instance: mockConnection,
      withKeyExchange: true,
      authorized: false,
    });

    expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
    expect(mockConnectToChannel).toHaveBeenCalledWith({
      authorized: false,
      channelId: mockConnection.channelId,
      withKeyExchange: true,
    });
  });

  it('should set receivedDisconnect to false', async () => {
    mockConnection.receivedDisconnect = true;

    await connect({
      instance: mockConnection,
      withKeyExchange: true,
      authorized: false,
    });

    expect(mockConnection.receivedDisconnect).toBe(false);
  });

  describe('With Key Exchange', () => {
    it('should initiate connection with key exchange when withKeyExchange is true', async () => {
      await connect({
        instance: mockConnection,
        withKeyExchange: true,
        authorized: false,
      });

      expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
      expect(mockConnectToChannel).toHaveBeenCalledWith({
        authorized: false,
        channelId: mockConnection.channelId,
        withKeyExchange: true,
      });
    });
  });

  describe('Without Key Exchange', () => {
    it('should not initiate connection with key exchange when withKeyExchange is false', () => {
      connect({
        instance: mockConnection,
        withKeyExchange: false,
        authorized: false,
      });

      expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
      expect(mockConnectToChannel).toHaveBeenCalledWith({
        authorized: false,
        channelId: mockConnection.channelId,
        withKeyExchange: false,
      });
    });
  });
});
