import resume from './resume';
import SDKConnect from '../SDKConnect';

jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');

describe('resume', () => {
  let mockInstance = {} as unknown as SDKConnect;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        connected: {},
        connecting: {},
      },
    } as unknown as SDKConnect;
  });

  describe('Resuming connections', () => {
    it('should resume the connection if not already resumed and not connecting', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
            isConnected: jest.fn().mockReturnValue(false),
          },
          resume: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      resume({
        channelId: '1',
        instance: mockInstance,
      });

      expect(mockInstance.state.connected['1'].resume).toHaveBeenCalled();
    });

    it('should wait for a brief period after resuming the connection', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
            isConnected: jest.fn().mockReturnValue(false),
          },
          resume: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      resume({
        channelId: '1',
        instance: mockInstance,
      });

      expect(mockInstance.state.connected['1'].resume).toHaveBeenCalled();
    });

    it('should log after resuming the connection', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
            isConnected: jest.fn().mockReturnValue(false),
          },
          resume: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      resume({
        channelId: '1',
        instance: mockInstance,
      });

      expect(mockInstance.state.connected['1'].resume).toHaveBeenCalled();
    });

    it('should skip resuming if the session is already connected', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
            isConnected: jest.fn().mockReturnValue(false),
          },
          resume: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      resume({
        channelId: '1',
        instance: mockInstance,
      });

      expect(mockInstance.state.connected['1'].resume).toHaveBeenCalled();
    });

    it('should skip resuming if the session is already resumed', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
            isConnected: jest.fn().mockReturnValue(false),
          },
          resume: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      resume({
        channelId: '1',
        instance: mockInstance,
      });

      expect(mockInstance.state.connected['1'].resume).toHaveBeenCalled();
    });

    it('should skip resuming if the session is currently connecting', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
            isConnected: jest.fn().mockReturnValue(false),
          },
          resume: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      resume({
        channelId: '1',
        instance: mockInstance,
      });

      expect(mockInstance.state.connected['1'].resume).toHaveBeenCalled();
    });
  });
});
