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
    connect({ instance: mockConnection, withKeyExchange: true });

    expect(DevLogger.log).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `Connection::connect() withKeyExchange=true id=testChannelId`,
    );
  });

  it('should call connectToChannel on the remote with channelId and key exchange flag', () => {
    connect({ instance: mockConnection, withKeyExchange: true });

    expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
    expect(mockConnectToChannel).toHaveBeenCalledWith({
      channelId: mockConnection.channelId,
      withKeyExchange: true,
    });
  });

  it('should set receivedDisconnect to false', () => {
    mockConnection.receivedDisconnect = true;

    connect({ instance: mockConnection, withKeyExchange: true });

    expect(mockConnection.receivedDisconnect).toBe(false);
  });

  it('should set loading state to true', () => {
    connect({ instance: mockConnection, withKeyExchange: true });

    expect(mockConnection.setLoading).toHaveBeenCalledTimes(1);
    expect(mockConnection.setLoading).toHaveBeenCalledWith(true);
  });

  describe('With Key Exchange', () => {
    it('should initiate connection with key exchange when withKeyExchange is true', () => {
      connect({ instance: mockConnection, withKeyExchange: true });

      expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
      expect(mockConnectToChannel).toHaveBeenCalledWith({
        channelId: mockConnection.channelId,
        withKeyExchange: true,
      });
    });
  });

  describe('Without Key Exchange', () => {
    it('should not initiate connection with key exchange when withKeyExchange is false', () => {
      connect({ instance: mockConnection, withKeyExchange: false });

      expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
      expect(mockConnectToChannel).toHaveBeenCalledWith({
        channelId: mockConnection.channelId,
        withKeyExchange: false,
      });
    });
  });
});
