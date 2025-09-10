import BackgroundTimer from 'react-native-background-timer';
import Device from '../../../util/device';
import SDKConnect from '../SDKConnect';
import handleAppState from './handleAppState';

jest.mock('@metamask/keyring-controller');
jest.mock('react-native-background-timer', () => ({
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
}));
jest.mock('../../Engine');
jest.mock('../../../util/Logger');
jest.mock('../../../util/device');
jest.mock('../SDKConnect');
jest.mock('../utils/wait.util');

describe('handleAppState', () => {
  let mockInstance = {} as unknown as SDKConnect;

  const mockHideLoadingState = jest.fn();
  const mockResume = jest.fn();
  const mockPause = jest.fn();

  const mockIsAndroid = Device.isAndroid as jest.MockedFunction<
    typeof Device.isAndroid
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHideLoadingState.mockResolvedValue(undefined);

    mockInstance = {
      state: {
        appState: '',
        paused: false,
        timeout: undefined,
        connecting: {},
        connected: {},
      },
      hideLoadingState: mockHideLoadingState,
      resume: mockResume,
      pause: mockPause,
    } as unknown as SDKConnect;
  });

  it('should skip handling if the app state is the same as current', () => {
    const mockAppState = 'mockAppState';
    mockInstance.state.appState = mockAppState;

    handleAppState({
      appState: mockAppState,
      instance: mockInstance,
    });

    expect(mockHideLoadingState).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockPause).not.toHaveBeenCalled();
  });

  it('should update the app state', () => {
    const mockAppState = 'mockAppState';

    handleAppState({
      appState: mockAppState,
      instance: mockInstance,
    });

    expect(mockInstance.state.appState).toBe(mockAppState);
  });

  describe('When app state is active', () => {
    it('should hide the loading state', () => {
      const mockAppState = 'active';

      handleAppState({
        appState: mockAppState,
        instance: mockInstance,
      });

      expect(mockHideLoadingState).toHaveBeenCalled();
    });

    it('should clear the timeout for other platforms', () => {
      const mockAppState = 'active';
      mockIsAndroid.mockReturnValue(false);

      handleAppState({
        appState: mockAppState,
        instance: mockInstance,
      });

      expect(BackgroundTimer.clearTimeout).not.toHaveBeenCalled();
    });

    it('should reset paused state to false', () => {
      const mockAppState = 'active';
      mockInstance.state.paused = true;

      handleAppState({
        appState: mockAppState,
        instance: mockInstance,
      });

      expect(mockInstance.state.paused).toBe(false);
    });
  });

  describe('When app state is background', () => {
    it('should pause connections on Android', () => {
      const mockAppState = 'background';
      mockIsAndroid.mockReturnValue(true);

      handleAppState({
        appState: mockAppState,
        instance: mockInstance,
      });

      expect(mockInstance.pause).toHaveBeenCalled();
    });

    it('should not start a timeout if already paused', () => {
      const mockAppState = 'background';
      mockInstance.state.paused = true;

      handleAppState({
        appState: mockAppState,
        instance: mockInstance,
      });

      expect(mockInstance.pause).not.toHaveBeenCalled();
    });
  });
});
