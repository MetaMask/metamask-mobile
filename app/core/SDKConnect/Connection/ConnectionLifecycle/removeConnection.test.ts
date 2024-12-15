import removeConnection from './removeConnection';
import { Connection } from '../Connection';
import DevLogger from '../../utils/DevLogger';

jest.mock('../Connection');
jest.mock('../../utils/DevLogger');

describe('removeConnection', () => {
  let mockConnection: Connection;

  const mockDisapprove = jest.fn();
  const mockDisconnect = jest.fn().mockImplementation(() => Promise.resolve(true));
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

    // Reset the mock implementation to return true by default
    mockDisconnect.mockImplementation(() => Promise.resolve(true));
  });

  it('should set isReady to false when disconnected', async () => {
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(true);
    expect(mockConnection.isReady).toBe(false);
  });

  it('should reset lastAuthorized to 0 when disconnected', async () => {
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(true);
    expect(mockConnection.lastAuthorized).toBe(0);
  });

  it('should set authorizedSent to false when disconnected', async () => {
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(true);
    expect(mockConnection.authorizedSent).toBe(false);
  });

  it('should log the removal action with context, channel ID, and disconnected status', async () => {
    await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(DevLogger.log).toHaveBeenCalledWith(
      'Connection::removeConnection() context=test id=testChannelId disconnected=true',
    );
  });

  it('should call disapprove with the channel ID when disconnected', async () => {
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(true);
    expect(mockDisapprove).toHaveBeenCalledTimes(1);
    expect(mockDisapprove).toHaveBeenCalledWith(mockConnection.channelId);
  });

  it('should call disconnect with terminate flag and specific context', async () => {
    await removeConnection({
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

  it('should trigger onDisconnect of the backgroundBridge if it exists and disconnected', async () => {
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(true);
    expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should set loading to false regardless of disconnect result', async () => {
    mockDisconnect.mockImplementation(() => Promise.resolve(false)); // Mock unsuccessful disconnect
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(false);
    expect(mockSetLoading).toHaveBeenCalledTimes(1);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('should not modify connection properties if disconnect fails', async () => {
    mockDisconnect.mockImplementation(() => Promise.resolve(false)); // Mock unsuccessful disconnect
    const result = await removeConnection({
      instance: mockConnection,
      terminate: true,
      context: 'test',
    });

    expect(result).toBe(false);
    expect(mockConnection.isReady).toBe(true);
    expect(mockConnection.lastAuthorized).not.toBe(0);
    expect(mockConnection.authorizedSent).toBe(true);
    expect(mockDisapprove).not.toHaveBeenCalled();
    expect(mockOnDisconnect).not.toHaveBeenCalled();
  });
});
