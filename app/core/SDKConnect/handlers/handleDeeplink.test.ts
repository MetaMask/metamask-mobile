import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';
import SDKConnect, { SDKConnectState } from '../SDKConnect';
import { waitForCondition } from '../utils/wait.util';
import handleDeeplink from './handleDeeplink';
import handleConnectionMessage from './handleConnectionMessage';
import Routes from '../../../constants/navigation/Routes';

jest.mock('../SDKConnect');
jest.mock('../../AppConstants');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');
jest.mock('../../../util/Logger');
jest.mock('./handleConnectionMessage');

describe('handleDeeplink', () => {
  let sdkConnect = {} as unknown as SDKConnect;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fakeConnections = {} as any;
  const rpc = Buffer.from('{"jsonrpc":"2.0","method":"eth_accounts"}').toString(
    'base64',
  );
  const mockWaitForCondition = waitForCondition as jest.MockedFunction<
    typeof waitForCondition
  >;

  const channelId = 'channel1';
  const origin = 'testOrigin';
  const url = 'https://example.com';
  const otherPublicKey = 'publicKey';
  const context = 'testContext';
  const protocolVersion = 2;

  const mockHasInitialized = jest.fn();
  const mockGetConnections = jest.fn();
  const mockUpdateSDKLoadingState = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockReconnect = jest.fn();
  const mockConnectToChannel = jest.fn();
  const mockHandleConnectionMessage =
    handleConnectionMessage as jest.MockedFunction<
      typeof handleConnectionMessage
    >;

  const mockDecrypt = jest
    .fn()
    .mockReturnValue('{"jsonrpc":"2.0","method":"eth_accounts"}');
  const mockGetConnected = jest.fn().mockReturnValue({
    [channelId]: {
      remote: {
        decrypt: mockDecrypt,
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockUpdateSDKLoadingState.mockResolvedValue(undefined);
    fakeConnections = [
      {
        channelId,
        origin,
        url,
        otherPublicKey,
        context,
      },
    ];

    sdkConnect = {
      hasInitialized: mockHasInitialized,
      getConnections: mockGetConnections,
      updateSDKLoadingState: mockUpdateSDKLoadingState,
      revalidateChannel: mockRevalidateChannel,
      reconnect: mockReconnect,
      connectToChannel: mockConnectToChannel,
      getConnected: mockGetConnected,
    } as unknown as SDKConnect;

    mockGetConnections.mockReturnValue(fakeConnections);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should waits for SDKConnect to initialize if not already initialized', async () => {
    mockHasInitialized.mockReturnValueOnce(false).mockReturnValueOnce(true);
    mockWaitForCondition.mockResolvedValue();

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      otherPublicKey,
      protocolVersion,
      context,
    });
    expect(waitForCondition).toHaveBeenCalledWith(expect.any(Object));
    expect(sdkConnect.hasInitialized).toHaveBeenCalledTimes(1);
  });

  it('should handles deeplink origin and modifies origin if url contains QR code parameter', async () => {
    const modifiedOrigin = AppConstants.DEEPLINKS.ORIGIN_QR_CODE;
    const modifiedUrl = `${url}&t=q`;

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      url: modifiedUrl,
      protocolVersion,
      otherPublicKey,
      context,
    });

    expect(sdkConnect.connectToChannel).toHaveBeenCalledWith({
      id: channelId,
      initialConnection: true,
      origin: modifiedOrigin,
      originatorInfo: undefined,
      protocolVersion,
      trigger: 'deeplink',
      otherPublicKey,
    });
  });

  it('should reconnects to an existing channel', async () => {
    mockHasInitialized.mockReturnValue(true);
    mockGetConnections.mockReturnValue({ [channelId]: {} });

    // Mock the getConnected method to return a connection that's not connected
    mockGetConnected.mockReturnValue({
      [channelId]: {
        remote: {
          isConnected: jest.fn().mockReturnValue(false),
        },
      },
    });

    sdkConnect.state = { connecting: {} } as unknown as SDKConnectState;

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      otherPublicKey,
      protocolVersion,
      context,
    });

    expect(sdkConnect.reconnect).toHaveBeenCalledWith({
      channelId,
      otherPublicKey,
      context,
      protocolVersion,
      initialConnection: false,
      trigger: 'deeplink',
      updateKey: true,
    });
  });

  it('should connects to a new channel if it does not exist', async () => {
    mockHasInitialized.mockReturnValue(true);
    mockGetConnections.mockReturnValue({});

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      protocolVersion,
      otherPublicKey,
      context,
    });

    expect(sdkConnect.connectToChannel).toHaveBeenCalledWith({
      id: channelId,
      initialConnection: true,
      origin,
      originatorInfo: undefined,
      protocolVersion,
      trigger: 'deeplink',
      otherPublicKey,
    });
  });

  it('should logs and continues on error during connection', async () => {
    const error = new Error('test error');
    mockHasInitialized.mockReturnValue(true);
    mockConnectToChannel.mockRejectedValue(error);

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      protocolVersion,
      url,
      otherPublicKey,
      context,
    });

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Failed to connect to channel',
    );
  });

  it('should handle rpc calls for existing connections', async () => {
    mockHasInitialized.mockReturnValue(true);
    mockGetConnections.mockReturnValue({ [channelId]: {} });

    sdkConnect.state = { connecting: {} } as unknown as SDKConnectState;

    // Mock a connected channel
    mockGetConnected.mockReturnValue({
      [channelId]: {
        remote: {
          isConnected: jest.fn().mockReturnValue(true),
          decrypt: mockDecrypt,
          getRPCMethodTracker: jest.fn().mockReturnValue({}),
        },
      },
    });

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      otherPublicKey,
      protocolVersion,
      context,
      rpc,
    });

    expect(mockDecrypt).toHaveBeenCalledWith(
      '{"jsonrpc":"2.0","method":"eth_accounts"}',
    );
    expect(handleConnectionMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(Object),
        connection: expect.any(Object),
        engine: expect.any(Object),
      }),
    );
  });

  it('should handle rpc calls for new connections', async () => {
    mockHasInitialized.mockReturnValue(true);
    mockGetConnections.mockReturnValue({});
    mockConnectToChannel.mockReturnValue({});
    mockGetConnected.mockReturnValue({
      [channelId]: {
        remote: {
          decrypt: mockDecrypt,
        },
      },
    });

    // Spy on JSON.parse
    const jsonParseSpy = jest.spyOn(JSON, 'parse');

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      otherPublicKey,
      protocolVersion,
      context,
      rpc,
    });

    expect(mockConnectToChannel).toHaveBeenCalled();

    // Verify that JSON.parse was called with the correct string
    expect(jsonParseSpy).toHaveBeenCalled();

    expect(mockHandleConnectionMessage).toHaveBeenCalled();
  });

  it('should not handle rpc calls when connection is not found', async () => {
    mockHasInitialized.mockReturnValue(true);
    mockGetConnections.mockReturnValue({});
    mockGetConnected.mockReturnValue({});

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      otherPublicKey,
      protocolVersion,
      context,
      rpc,
    });

    expect(mockConnectToChannel).toHaveBeenCalled();
    expect(mockDecrypt).not.toHaveBeenCalled();
    expect(handleConnectionMessage).not.toHaveBeenCalled();
  });

  it('navigates to ReturnToDappToast and sets trigger to resume', async () => {
    mockHasInitialized.mockReturnValue(true);
    mockGetConnections.mockReturnValue({ [channelId]: {} });

    const navigate = jest.fn();
    const connectionObject = {
      remote: {
        isConnected: jest.fn().mockReturnValue(true),
        decrypt: mockDecrypt,
        getRPCMethodTracker: jest.fn().mockReturnValue({}),
      },
      navigation: { navigate },
      originatorInfo: { url: 'https://dapp.example' },
      trigger: 'deeplink',
      origin: 'testOrigin',
    };

    mockGetConnected.mockReturnValue({
      [channelId]: connectionObject,
    });

    await handleDeeplink({
      sdkConnect,
      channelId,
      origin,
      url,
      otherPublicKey,
      protocolVersion,
      context,
      rpc,
    });

    expect(connectionObject.trigger).toBe('resume');
    expect(navigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SDK.RETURN_TO_DAPP_TOAST,
      method: 'eth_accounts',
      origin: 'https://dapp.example',
    });
  });
});
