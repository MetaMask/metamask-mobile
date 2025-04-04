import SDKConnect from '../SDKConnect';
import { waitForKeychainUnlocked } from '../utils/wait.util';
import updateSDKLoadingState from './updateSDKLoadingState';

jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('@metamask/keyring-controller');
jest.mock('../utils/wait.util');
jest.mock('../../Engine');
jest.mock('../../../constants/navigation/Routes');

describe('updateSDKLoadingState', () => {
  let mockInstance = {} as unknown as SDKConnect;

  const mockWaitForKeychainUnlocked =
    waitForKeychainUnlocked as jest.MockedFunction<
      typeof waitForKeychainUnlocked
    >;

  const mockNavigate = jest.fn();
  const mockHideLoadingState = jest.fn(
    () => new Promise((resolve) => resolve('')),
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockWaitForKeychainUnlocked.mockResolvedValue(true);

    mockInstance = {
      state: {
        sdkLoadingState: {},
        navigation: {
          navigate: mockNavigate,
        },
      },
      hideLoadingState: mockHideLoadingState,
    } as unknown as SDKConnect;
  });

  it('should add channelId to sdkLoadingState when loading is true', () => {
    const mockChannelId = 'mockChannelId';
    const mockLoading = true;

    updateSDKLoadingState({
      channelId: mockChannelId,
      loading: mockLoading,
      instance: mockInstance,
    });

    expect(mockInstance.state.sdkLoadingState[mockChannelId]).toBe(mockLoading);
  });

  it('should remove channelId from sdkLoadingState when loading is false', () => {
    const mockChannelId = 'mockChannelId';
    const mockLoading = false;
    mockInstance.state.sdkLoadingState[mockChannelId] = true;

    updateSDKLoadingState({
      channelId: mockChannelId,
      loading: mockLoading,
      instance: mockInstance,
    });

    expect(mockInstance.state.sdkLoadingState[mockChannelId]).toBeUndefined();
  });

  it('should log the current loading state and number of loading sessions', () => {
    const mockChannelId = 'mockChannelId';
    const mockLoading = true;
    mockInstance.state.sdkLoadingState[mockChannelId] = true;

    updateSDKLoadingState({
      channelId: mockChannelId,
      loading: mockLoading,
      instance: mockInstance,
    });

    expect(mockInstance.state.sdkLoadingState[mockChannelId]).toBe(mockLoading);
  });

  it('should call hideLoadingState if there are no active loading sessions', () => {
    const mockChannelId = 'mockChannelId';
    const mockLoading = false;
    mockInstance.state.sdkLoadingState[mockChannelId] = true;

    updateSDKLoadingState({
      channelId: mockChannelId,
      loading: mockLoading,
      instance: mockInstance,
    });

    expect(mockHideLoadingState).toHaveBeenCalled();
  });

  it('should wait for keychain to be unlocked before navigating to loading screen', () => {
    const mockChannelId = 'mockChannelId';
    const mockLoading = true;
    mockInstance.state.sdkLoadingState[mockChannelId] = true;

    updateSDKLoadingState({
      channelId: mockChannelId,
      loading: mockLoading,
      instance: mockInstance,
    });

    expect(mockInstance.state.sdkLoadingState[mockChannelId]).toBe(mockLoading);
  });
});
