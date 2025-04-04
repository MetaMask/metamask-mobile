import pause from './pause';
import SDKConnect from '../SDKConnect';

jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');

describe('pause', () => {
  let mockInstance = {} as unknown as SDKConnect;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        paused: false,
        connected: {},
        connecting: {},
      },
    } as unknown as SDKConnect;
  });

  it('should not pause if instance is already paused', () => {
    mockInstance.state.paused = true;

    pause(mockInstance);

    expect(mockInstance.state.paused).toBe(true);
  });

  describe('Pausing connections', () => {
    it('should skip pausing non-active connections', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(false),
          },
          pause: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      pause(mockInstance);

      expect(
        mockInstance.state.connected['1'].remote.isReady,
      ).toHaveBeenCalled();
      expect(mockInstance.state.connected['1'].pause).not.toHaveBeenCalled();
    });

    it('should pause active connections', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
          },
          pause: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      pause(mockInstance);

      expect(
        mockInstance.state.connected['1'].remote.isReady,
      ).toHaveBeenCalled();
      expect(mockInstance.state.connected['1'].pause).toHaveBeenCalled();
    });

    it('should log the pausing and paused status of each connection', () => {
      mockInstance.state.connected = {
        '1': {
          remote: {
            isReady: jest.fn().mockReturnValue(true),
            isPaused: jest.fn().mockReturnValue(false),
          },
          pause: jest.fn(),
        },
      } as unknown as SDKConnect['state']['connected'];

      pause(mockInstance);

      expect(
        mockInstance.state.connected['1'].remote.isReady,
      ).toHaveBeenCalled();
      expect(mockInstance.state.connected['1'].pause).toHaveBeenCalled();
      expect(
        mockInstance.state.connected['1'].remote.isPaused,
      ).toHaveBeenCalled();
    });
  });

  it('should set the instance state to paused', () => {
    pause(mockInstance);

    expect(mockInstance.state.paused).toBe(true);
  });

  it('should reset the connecting state', () => {
    mockInstance.state.connecting = {
      '1': {},
    } as unknown as SDKConnect['state']['connecting'];

    pause(mockInstance);

    expect(mockInstance.state.connecting).toEqual({});
  });
});
