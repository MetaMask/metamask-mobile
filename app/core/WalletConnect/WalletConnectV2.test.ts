import { WC2Manager } from './WalletConnectV2';
import { Client } from '@walletconnect/se-sdk';
import { NavigationContainerRef } from '@react-navigation/native';
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
    ANDROID: 'com.test.app',
  },
}));

jest.mock('@walletconnect/se-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    updateSession: jest.fn().mockResolvedValue(true),
    getPendingSessionRequests: jest.fn(),
    getActiveSessions: jest.fn().mockReturnValue({
      'test-topic': {
        topic: 'test-topic',
        pairingTopic: 'test-pairing',
        peer: {
          metadata: { url: 'https://example.com', name: 'Test App', icons: [] },
        },
      },
    }),
    approveSession: jest.fn(),
    rejectSession: jest.fn(),
    on: jest.fn(),
  })),
  SingleEthereum: {
    init: jest.fn().mockResolvedValue({
      approveSession: jest.fn().mockResolvedValue({
        topic: 'test-topic',
        pairingTopic: 'test-pairing',
        peer: {
          metadata: {
            url: 'https://example.com',
            name: 'Test App',
            icons: [],
          },
        },
        inpageProvider: {},
      }),
      rejectSession: jest.fn(),
      rejectRequest: jest.fn(),
      getActiveSessions: jest.fn().mockReturnValue({
        'test-topic': {
          topic: 'test-topic',
          pairingTopic: 'test-pairing',
          peer: {
            metadata: {
              url: 'https://example.com',
              name: 'Test App',
              icons: [],
            },
          },
        },
      }),
      getPendingSessionRequests: jest.fn().mockReturnValue([]),
      updateSession: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
    }),
  },
}));

jest.mock('../Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
      }),
    },
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
    },
    PermissionController: {
      requestPermissions: jest.fn().mockResolvedValue(true),
      getPermission: jest.fn().mockReturnValue({
        id: 'mockPermissionId',
      }),
      revokeAllPermissions: jest.fn(),
    },
  },
}));

jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest
    .fn()
    .mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']),
}));

jest.mock('../../selectors/networkController', () => ({
  selectChainId: jest.fn().mockReturnValue('0x1'),
}));

jest.mock('../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('./WalletConnect2Session', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    updateSession: jest.fn(),
    handleRequest: jest.fn(),
    removeListeners: jest.fn(),
  })),
}));

jest.mock('../BackgroundBridge/BackgroundBridge', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    inpageProvider: {},
  })),
}));

describe('WC2Manager', () => {
  let manager: WC2Manager;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockClient: Client;
  let mockNavigation: NavigationContainerRef;
  let mockApproveSession;

  beforeEach(async () => {
    mockClient = new Client();
    mockNavigation = {
      getCurrentRoute: jest.fn().mockReturnValue({ name: 'Home' }),
    } as unknown as NavigationContainerRef;

    Engine.context = {
      AccountsController: {
        getSelectedAccount: jest.fn().mockReturnValue({
          address: '0x1234567890abcdef1234567890abcdef12345678',
        }),
      },
      KeyringController: {
        isUnlocked: jest.fn().mockReturnValue(true),
      },
      PermissionController: {
        requestPermissions: jest.fn().mockResolvedValue(true),
        getPermission: jest.fn().mockReturnValue({
          id: 'mockPermissionId',
        }),
        revokeAllPermissions: jest.fn(),
      },
    };

    manager = await WC2Manager.init({ navigation: mockNavigation });

    // Explicitly re-mock the approveSession on the correct instance
    mockApproveSession = jest.spyOn(manager.web3Wallet, 'approveSession');
  });

  it('should correctly handle a session proposal', async () => {
    const mockSessionProposal = {
      id: 1,
      params: {
        pairingTopic: 'test-pairing',
        proposer: {
          metadata: {
            url: 'https://example.com',
            description: 'Test App',
            icons: ['https://example.com/icon.png'],
          },
        },
      },
    } as unknown as SingleEthereumTypes.SessionProposal;

    try {
      await manager.onSessionProposal(mockSessionProposal);
    } catch (error) {
      console.error('Error during onSessionProposal execution', error);
    }

    // Verify directly if approveSession is being called
    expect(mockApproveSession).toHaveBeenCalled(); // Simply check if it was called

    // Check if approveSession was called with the expected parameters
    expect(mockApproveSession).toHaveBeenCalledWith({
      id: 1,
      chainId: 1,
      accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
    });
  });
});
