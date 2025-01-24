import { NativeModules, Platform } from 'react-native';
import SDKConnect from '../SDKConnect';
import bindAndroidSDK from './bindAndroidSDK';

jest.mock('../SDKConnect');
jest.mock('../../../util/Logger');

describe('bindAndroidSDK', () => {
  let mockInstance = {} as unknown as SDKConnect;

  beforeEach(() => {
    jest.clearAllMocks();

    NativeModules.CommunicationClient = {
      bindService: jest.fn(),
    };

    mockInstance = {
      state: {
        androidSDKBound: false,
      },
    } as unknown as SDKConnect;
  });

  it('should return early if the platform is not android', async () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Platform as any).OS = 'ios';

    await bindAndroidSDK(mockInstance);

    expect(
      NativeModules.CommunicationClient.bindService,
    ).not.toHaveBeenCalled();
  });

  it('should return early if the Android SDK is already bound', async () => {
    mockInstance.state.androidSDKBound = true;

    await bindAndroidSDK(mockInstance);

    expect(
      NativeModules.CommunicationClient.bindService,
    ).not.toHaveBeenCalled();
  });
});
