import {
  BitcoinWalletSnapClient,
  MultichainWalletSnapClient,
  MultichainWalletSnapFactory,
  SolanaWalletSnapClient,
  WalletClientType,
} from './MultichainWalletSnapClient';
import { CaipChainId, SnapId } from '@metamask/snaps-sdk';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../Engine';
import { Sender } from '@metamask/keyring-snap-client';
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { BtcScope, SolScope } from '@metamask/keyring-api';

jest.mock('../Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  getSnapKeyring: jest.fn(),
  context: {
    AccountsController: {
      getNextAvailableAccountName: jest.fn().mockReturnValue('Snap Account 1'),
    },
  },
}));

const mockKeyringClient = {
  listAccounts: jest.fn(),
  getAccount: jest.fn(),
  getAccountBalances: jest.fn(),
  createAccount: jest.fn(),
  discoverAccounts: jest.fn(),
};

jest.mock('@metamask/keyring-snap-client', () => ({
  KeyringClient: jest.fn().mockImplementation(() => mockKeyringClient),
  Sender: jest.fn(),
}));

const mockDiscoveredAccounts = [
  {
    type: 'bip44',
    scope: [SolScope.Mainnet],
    derivationPath: "m/44'/60'/0'/0",
  },
];

describe('MultichainWalletSnapClient', () => {
  const mockSnapId = 'mock-snap-id' as SnapId;
  const mockSnapName = 'mock-snap-name';
  const mockSnapKeyringOptions = {
    displayConfirmation: false,
    displayAccountNameSuggestion: false,
    setSelectedAccount: false,
  };

  class TestMultichainWalletSnapClient extends MultichainWalletSnapClient {
    constructor() {
      super(mockSnapId, mockSnapName, mockSnapKeyringOptions);
    }

    getScope(): CaipChainId {
      return SolScope.Mainnet;
    }

    protected getSnapSender(): Sender {
      return {} as Sender;
    }

    getClientType(): WalletClientType {
      return WalletClientType.Solana;
    }

    public testWithSnapKeyring(
      callback: (keyring: SnapKeyring) => Promise<void>,
    ) {
      return this.withSnapKeyring(callback);
    }
  }

  let client: TestMultichainWalletSnapClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new TestMultichainWalletSnapClient();
  });

  describe('getSnapId', () => {
    it('should return the snap ID', () => {
      expect(client.getSnapId()).toBe(mockSnapId);
    });
  });

  describe('getSnapName', () => {
    it('should return the snap name', () => {
      expect(client.getSnapName()).toBe(mockSnapName);
    });
  });

  describe('withSnapKeyring', () => {
    it('calls the callback with the keyring', async () => {
      const mockCallback = jest.fn();
      const mockKeyring = { test: 'keyring' };

      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        async (_, __, callback) => {
          await callback({ keyring: mockKeyring });
        },
      );

      await client.testWithSnapKeyring(mockCallback);

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'KeyringController:withKeyring',
        { type: KeyringTypes.snap },
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalledWith(mockKeyring);
    });

    it('handles errors from the controller messenger', async () => {
      const mockError = new Error('Test error');
      (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(
        mockError,
      );

      await expect(client.testWithSnapKeyring(jest.fn())).rejects.toThrow(
        'Test error',
      );
    });
  });

  describe('createAccount', () => {
    it('creates an account with the provided options', async () => {
      const mockOptions = {
        scope: SolScope.Mainnet,
        accountNameSuggestion: 'Test Account',
        entropySource: 'test-entropy',
      };

      const mockKeyring = {
        createAccount: jest.fn(),
      };

      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        async (_, __, callback) => {
          await callback({ keyring: mockKeyring });
        },
      );

      await client.createAccount(mockOptions);

      expect(mockKeyring.createAccount).toHaveBeenCalledWith(
        mockSnapId,
        mockOptions,
        mockSnapKeyringOptions,
      );
    });
  });

  describe('discoverAccounts', () => {
    it('discovers accounts with the provided parameters', async () => {
      const mockScopes = [SolScope.Mainnet];
      const mockEntropySource = 'test-entropy';
      const mockGroupIndex = 0;
      mockKeyringClient.discoverAccounts.mockResolvedValue(
        mockDiscoveredAccounts,
      );

      const result = await client.discoverAccounts(
        mockScopes,
        mockEntropySource,
        mockGroupIndex,
      );

      expect(result).toEqual(mockDiscoveredAccounts);
      expect(mockKeyringClient.discoverAccounts).toHaveBeenCalledWith(
        mockScopes,
        mockEntropySource,
        mockGroupIndex,
      );
    });
  });

  describe('addDiscoveredAccounts', () => {
    it('adds discovered accounts to the keyring', async () => {
      const mockEntropySource = 'test-entropy';

      const mockKeyring = {
        createAccount: jest.fn(),
      };

      mockKeyringClient.discoverAccounts.mockResolvedValue(
        mockDiscoveredAccounts,
      );

      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        async (_, __, callback) => {
          await callback({ keyring: mockKeyring });
        },
      );

      await client.addDiscoveredAccounts(mockEntropySource);

      expect(mockKeyring.createAccount).toHaveBeenCalledTimes(1);
      expect(mockKeyring.createAccount).toHaveBeenCalledWith(
        mockSnapId,
        {
          derivationPath: mockDiscoveredAccounts[0].derivationPath,
          entropySource: mockEntropySource,
        },
        mockSnapKeyringOptions,
      );
    });
  });

  describe('MultichainWalletSnapFactory', () => {
    it('creates a BitcoinWalletSnapClient', () => {
      const bitcoinClient = MultichainWalletSnapFactory.createClient(
        WalletClientType.Bitcoin,
      );

      expect(bitcoinClient).toBeInstanceOf(BitcoinWalletSnapClient);
    });

    it('creates a SolanaWalletSnapClient', () => {
      const solanaClient = MultichainWalletSnapFactory.createClient(
        WalletClientType.Solana,
      );
      expect(solanaClient).toBeInstanceOf(SolanaWalletSnapClient);
    });

    it('throws if an invalid wallet type is provided', () => {
      expect(() =>
        MultichainWalletSnapFactory.createClient('invalid' as WalletClientType),
      ).toThrow('Unsupported client type: invalid');
    });

    it('passes options to the client', () => {
      const mockOptions = {
        displayConfirmation: true,
        displayAccountNameSuggestion: true,
        setSelectedAccount: false,
      };

      const snapClient = MultichainWalletSnapFactory.createClient(
        WalletClientType.Bitcoin,
        mockOptions,
      );

      expect(snapClient.snapKeyringOptions).toStrictEqual(mockOptions);
    });
  });

  describe('BitcoinWalletSnapClient', () => {
    it('should create a BitcoinWalletSnapClient', () => {
      const bitcoinClient = new BitcoinWalletSnapClient(mockSnapKeyringOptions);
      expect(bitcoinClient).toBeDefined();
    });

    it('getScope returns bitcoin network', () => {
      const bitcoinClient = new BitcoinWalletSnapClient(mockSnapKeyringOptions);
      expect(bitcoinClient.getScope()).toEqual(BtcScope.Mainnet);
    });
  });

  describe('SolanaWalletSnapClient', () => {
    it('should create a SolanaWalletSnapClient', () => {
      const solanaClient = new SolanaWalletSnapClient(mockSnapKeyringOptions);
      expect(solanaClient).toBeDefined();
    });

    it('getScope returns solana network', () => {
      const solanaClient = new SolanaWalletSnapClient(mockSnapKeyringOptions);
      expect(solanaClient.getScope()).toEqual(SolScope.Mainnet);
    });
  });
});
