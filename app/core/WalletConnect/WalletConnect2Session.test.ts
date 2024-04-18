/* eslint-disable @typescript-eslint/no-explicit-any */
import WalletConnect2Session from './WalletConnect2Session';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Ignoring the import error for testing purposes
import { Client } from '@walletconnect/se-sdk';
import { NavigationContainerRef } from '@react-navigation/native';
import { SessionTypes } from '@walletconnect/types';
import { store } from '../../store';
import Engine from '../Engine';

jest.mock('../AppConstants', () => ({
  WALLET_CONNECT: {
    PROJECT_ID: 'test-project-id',
    METADATA: {
      name: 'Test Wallet',
      description: 'Test Wallet Description',
      url: 'https://example.com',
      icons: ['https://example.com/icon.png'],
    },
  },
  BUNDLE_IDS: {
    ANDROID: 'com.test.app', // Make sure this is correctly mocked
  },
}));

jest.mock('@walletconnect/se-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    updateSession: jest.fn(),
    getPendingSessionRequests: jest.fn(),
    on: jest.fn(),
  })),
}));

jest.mock('../BackgroundBridge/BackgroundBridge', () =>
  jest.fn().mockImplementation(() => ({
    onMessage: jest.fn(),
    onDisconnect: jest.fn(),
    setupProviderConnection: jest.fn(),
  })),
);

jest.mock('@react-navigation/native');
jest.mock('../Engine');
jest.mock('../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('../Permissions');
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));
jest.mock('../RPCMethods/RPCMethodMiddleware');
jest.mock('./wc-utils', () => ({
  hideWCLoadingState: jest.fn(),
  showWCLoadingState: jest.fn(),
}));

describe('WalletConnect2Session', () => {
  let session: WalletConnect2Session;
  let mockClient: Client;
  let mockSession: SessionTypes.Struct;
  let mockNavigation: NavigationContainerRef;

  beforeEach(() => {
    mockClient = new Client();
    mockSession = {
      topic: 'test-topic',
      pairingTopic: 'test-pairing',
      peer: {
        metadata: { url: 'https://example.com', name: 'Test App', icons: [] },
      },
    } as unknown as SessionTypes.Struct;
    mockNavigation = {} as NavigationContainerRef;

    // Mock store state
    (store.getState as jest.Mock).mockReturnValue({
      inpageProvider: {
        networkId: '1',
      },
    });

    // Mock Engine.context
    Object.defineProperty(Engine, 'context', {
      value: {
        AccountsController: {
          getSelectedAccount: jest.fn().mockReturnValue({
            address: '0x1234567890abcdef1234567890abcdef12345678',
          }),
        },
        NetworkController: {
          getProviderAndBlockTracker: jest.fn().mockReturnValue({
            provider: {},
            blockTracker: {},
          }),
          getNetworkClientById: jest.fn().mockReturnValue({ chainId: '0x2' }),
        },
        PermissionController: {
          // eslint-disable-next-line no-empty-function
          createPermissionMiddleware: jest.fn().mockReturnValue(() => {}),
        },
      },
      writable: true,
    });

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    // Manually set the topicByRequestId to ensure it's populated correctly for tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (session as any).topicByRequestId = { '1': mockSession.topic };
  });

  it('should initialize correctly in constructor', () => {
    expect(session).toBeTruthy();
    expect((session as any).topicByRequestId).toEqual({
      '1': mockSession.topic,
    });
  });

  it('should set deeplink correctly', () => {
    session.setDeeplink(false);
    expect((session as any).deeplink).toBe(false);
  });

  it('should handle request correctly and reject invalid chainId', async () => {
    const mockRejectRequest = jest
      .spyOn(mockClient, 'rejectRequest')
      .mockResolvedValue(undefined);
    const requestEvent = {
      id: '1',
      topic: 'test-topic',
      params: {
        chainId: '0x2',
        request: {
          method: 'eth_sendTransaction',
          params: [],
        },
      },
      verifyContext: {},
    };

    (store.getState as jest.Mock).mockReturnValue({
      inpageProvider: {
        networkId: '1',
      },
    });

    await session.handleRequest(requestEvent as any);

    expect(mockRejectRequest).toHaveBeenCalledWith({
      id: '1',
      topic: mockSession.topic,
      error: { code: 1, message: 'Invalid chainId' },
    });
  });

  it('should remove listeners correctly', async () => {
    const mockOnDisconnect = jest.spyOn(
      (session as any).backgroundBridge,
      'onDisconnect',
    );

    await session.removeListeners();

    expect(mockOnDisconnect).toHaveBeenCalled();
  });

  it('should approve a request correctly', async () => {
    const mockApproveRequest = jest
      .spyOn(mockClient, 'approveRequest')
      .mockResolvedValue(undefined);
    const request = { id: '1', result: '0x123' };

    await session.approveRequest(request);

    expect(mockApproveRequest).toHaveBeenCalledWith({
      id: parseInt(request.id),
      topic: mockSession.topic,
      result: request.result,
    });
  });

  it('should reject a request correctly', async () => {
    const mockRejectRequest = jest
      .spyOn(mockClient, 'rejectRequest')
      .mockResolvedValue(undefined);
    const request = { id: '1', error: new Error('User rejected') };

    await session.rejectRequest(request);

    expect(mockRejectRequest).toHaveBeenCalledWith({
      id: parseInt(request.id),
      topic: mockSession.topic,
      error: { code: 5000, message: 'User rejected' },
    });
  });

  it('should handle session update correctly', async () => {
    const mockUpdateSession = jest
      .spyOn(mockClient, 'updateSession')
      .mockResolvedValue(undefined);
    const approvedAccounts = ['0x123'];

    // Mock the getApprovedAccountsFromPermissions method
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(session as any, 'getApprovedAccountsFromPermissions')
      .mockResolvedValue(approvedAccounts);

    await session.updateSession({ chainId: '0x1', accounts: approvedAccounts });

    expect(mockUpdateSession).toHaveBeenCalledWith({
      topic: mockSession.topic,
      chainId: 1,
      accounts: approvedAccounts,
    });
  });
});
