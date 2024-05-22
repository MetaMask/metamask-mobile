import { Connection } from '../Connection';
import handleClientsDisconnected from './handleClientsDisconnected';

jest.mock('../../utils/DevLogger');

describe('handleClientsDisconnected', () => {
  let mockConnection: Connection;

  const spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

  const mockDisapprove = jest.fn();
  const mockSetLoading = jest.fn();
  const mockDisconnect = jest.fn();
  const mockIsPaused = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      channelId: 'testChannelId',
      origin: 'testOrigin',
      setLoading: mockSetLoading,
      disconnect: mockDisconnect,
      remote: {
        isPaused: mockIsPaused,
        hasRelayPersistence: jest.fn(() => false),
      },
      isReady: true,
      receivedClientsReady: true,
      receivedDisconnect: false,
      otps: {},
    } as unknown as Connection;
  });

  it('should set loading to false', () => {
    const handler = handleClientsDisconnected({
      instance: mockConnection,
      disapprove: mockDisapprove,
    });

    handler();

    expect(mockSetLoading).toHaveBeenCalledTimes(1);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  describe('When connection is not paused', () => {
    beforeEach(() => {
      mockIsPaused.mockReturnValue(false);
    });

    it('should disapprove the connection if origin is not a deeplink', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(mockDisapprove).toHaveBeenCalledTimes(1);
      expect(mockDisapprove).toHaveBeenCalledWith(mockConnection.channelId);
    });

    it('should set initialConnection to false and clear otps', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(mockConnection.initialConnection).toBe(false);
      expect(mockConnection.otps).toBeUndefined();
    });

    it('should set receivedDisconnect to true', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(mockConnection.receivedDisconnect).toBe(true);
    });

    it('should reset connection state to not ready and not receivedClientsReady', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(mockConnection.isReady).toBe(false);
      expect(mockConnection.receivedClientsReady).toBe(false);
    });
  });

  describe('When connection is paused', () => {
    beforeEach(() => {
      mockIsPaused.mockReturnValue(true);
    });
    it('should not disapprove the connection', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(mockDisapprove).not.toHaveBeenCalled();
    });

    it('should not set initialConnection to false or clear otps', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(mockConnection.initialConnection).toBe(undefined);
      expect(mockConnection.otps).toBeDefined();
    });

    it('should not warn about connection interruption', () => {
      const handler = handleClientsDisconnected({
        instance: mockConnection,
        disapprove: mockDisapprove,
      });

      handler();

      expect(spyConsoleWarn).not.toHaveBeenCalled();
    });
  });
});
