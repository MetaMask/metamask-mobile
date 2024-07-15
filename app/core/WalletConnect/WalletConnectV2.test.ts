/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavigationContainerRef } from '@react-navigation/native';
import { SessionTypes } from '@walletconnect/types';
import Client, { SingleEthereumTypes } from '@walletconnect/se-sdk';
import { WC2Manager } from './WalletConnectV2';

jest.mock('../BackgroundBridge/BackgroundBridge');
jest.mock('../../store');
jest.mock('../Engine');
jest.mock('../Permissions');
jest.mock('../../selectors/networkController');
jest.mock('../../../app/actions/sdk');
jest.mock('../../store/async-storage-wrapper');
jest.mock('@walletconnect/utils');
jest.mock('./wc-utils');

describe('WC2Manager', () => {
  let mockWeb3Wallet: jest.Mocked<Client>;
  let mockSession: SessionTypes.Struct;
  let mockNavigation: jest.Mocked<NavigationContainerRef>;

  beforeEach(() => {
    mockWeb3Wallet = {
      approveRequest: jest.fn(),
      rejectRequest: jest.fn(),
      getPendingSessionRequests: jest.fn(),
      getActiveSessions: jest.fn(),
      disconnectSession: jest.fn(),
      engine: {
        web3wallet: {
          engine: {
            signClient: {
              session: {
                delete: jest.fn(),
              },
            },
          },
        },
      },
      on: jest.fn(),
      core: {
        pairing: {
          pair: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<Client>;

    mockSession = {
      topic: 'test-topic',
      pairingTopic: 'test-pairing-topic',
      peer: {
        metadata: {
          url: 'https://test.com',
          name: 'Test',
          icons: ['https://test.com/icon.png'],
        },
      },
    } as unknown as SessionTypes.Struct;

    mockNavigation = {
      navigate: jest.fn(),
      getCurrentRoute: jest.fn().mockReturnValue({ name: 'TestRoute' }),
    } as unknown as jest.Mocked<NavigationContainerRef>;

    jest.clearAllMocks();
  });

  it('should approve a request correctly', async () => {
    const session = new (WC2Manager as any).WalletConnect2Session({
      web3Wallet: mockWeb3Wallet,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: false,
      navigation: mockNavigation,
    });

    const requestId = '1';
    const result = '0x123';

    await session.approveRequest({ id: requestId, result });

    expect(mockWeb3Wallet.approveRequest).toHaveBeenCalledWith({
      id: parseInt(requestId),
      topic: mockSession.topic,
      result,
    });
  });

  it('should reject a request correctly', async () => {
    const session = new (WC2Manager as any).WalletConnect2Session({
      web3Wallet: mockWeb3Wallet,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: false,
      navigation: mockNavigation,
    });

    const requestId = '1';
    const error = new Error('User rejected');

    await session.rejectRequest({ id: requestId, error });

    expect(mockWeb3Wallet.rejectRequest).toHaveBeenCalledWith({
      id: parseInt(requestId),
      topic: mockSession.topic,
      error: {
        code: 5000,
        message: error.message,
      },
    });
  });

  it('should update a session correctly', async () => {
    const session = new (WC2Manager as any).WalletConnect2Session({
      web3Wallet: mockWeb3Wallet,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: false,
      navigation: mockNavigation,
    });

    const chainId = 1;
    const accounts = ['0x123'];

    await session.updateSession({ chainId, accounts });

    expect(mockWeb3Wallet.updateSession).toHaveBeenCalledWith({
      topic: mockSession.topic,
      chainId,
      accounts,
    });
  });

  it('should initialize the WC2Manager correctly', async () => {
    const mockInstance = await WC2Manager.init({ navigation: mockNavigation });
    expect(mockInstance).toBeInstanceOf(WC2Manager);
  });

  it('should handle session proposals correctly', async () => {
    const manager = new (WC2Manager as any)(mockWeb3Wallet, {}, mockNavigation);

    const proposal = {
      id: 1,
      params: {
        pairingTopic: 'test-pairing-topic',
        proposer: {
          metadata: {
            url: 'https://test.com',
            description: 'Test',
            icons: ['https://test.com/icon.png'],
          },
        },
      },
    } as unknown as SingleEthereumTypes.SessionProposal;

    const mockApproveSession = jest.fn().mockResolvedValue(mockSession);
    mockWeb3Wallet.approveSession = mockApproveSession;

    await manager.onSessionProposal(proposal);

    expect(mockWeb3Wallet.approveSession).toHaveBeenCalled();
  });

  it('should handle session requests correctly', async () => {
    const manager = new (WC2Manager as any)(mockWeb3Wallet, {}, mockNavigation);
    const requestEvent = {
      id: 1,
      topic: 'test-topic',
      params: {
        request: {
          method: 'eth_sendTransaction',
          params: [{}],
        },
        chainId: 1,
      },
    } as unknown as SingleEthereumTypes.SessionRequest;

    const session = new (WC2Manager as any).WalletConnect2Session({
      web3Wallet: mockWeb3Wallet,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: false,
      navigation: mockNavigation,
    });

    manager.sessions['test-topic'] = session;

    const mockHandleRequest = jest.fn();
    session.handleRequest = mockHandleRequest;

    await manager.onSessionRequest(requestEvent);

    expect(mockHandleRequest).toHaveBeenCalledWith(requestEvent);
  });
});
