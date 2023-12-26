import removeConnection from './removeConnection';
import { Connection } from '../Connection';
import DevLogger from '../../utils/DevLogger';

jest.mock('../Connection');
jest.mock('../../utils/DevLogger');

describe('removeConnection', () => {
  let mockConnection: Connection;

  const mockDisapprove = jest.fn();
  const mockDisconnect = jest.fn();
  const mockOnDisconnect = jest.fn();
  const mockSetLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      channelId: 'testChannelId',
      isReady: true,
      lastAuthorized: Date.now(),
      authorizedSent: true,
      disapprove: mockDisapprove,
      disconnect: mockDisconnect,
      backgroundBridge: {
        onDisconnect: mockOnDisconnect,
      },
      setLoading: mockSetLoading,
    } as unknown as Connection;
  });

  it('should set isReady to false', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockConnection.isReady).toBe(false);
  });

  it('should reset lastAuthorized to 0', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockConnection.lastAuthorized).toBe(0);
  });

  it('should set authorizedSent to false', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockConnection.authorizedSent).toBe(false);
  });

  it('should log the removal action with context and channel ID', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(DevLogger.log).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `Connection::removeConnection() context=test id=testChannelId`,
    );
  });

  it('should call disapprove with the channel ID', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockDisapprove).toHaveBeenCalledTimes(1);
    expect(mockDisapprove).toHaveBeenCalledWith(mockConnection.channelId);
  });

  it('should call disconnect with terminate flag and specific context', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledWith({
      terminate: true,
      context: 'Connection::removeConnection',
    });
  });

  it('should trigger onDisconnect of the backgroundBridge if it exists', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should set loading to false', () => {
    removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(mockSetLoading).toHaveBeenCalledTimes(1);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
