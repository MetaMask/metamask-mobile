import {
  BitcoinWalletSnapClient,
  MultichainWalletSnapClient,
  MultichainWalletSnapFactory,
  SolanaWalletSnapClient,
  TronWalletSnapClient,
  WalletClientType,
} from './MultichainWalletSnapClient';
import { CaipChainId, SnapId } from '@metamask/snaps-sdk';
import Engine from '../Engine';
import { Sender } from '@metamask/keyring-snap-client';
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { SolScope } from '@metamask/keyring-api';
import { BitcoinWalletSnapSender } from './BitcoinWalletSnap';
import { SolanaWalletSnapSender } from './SolanaWalletSnap';
import { TronWalletSnapSender } from './TronWalletSnap';

const mockSnapKeyring = {
  createAccount: jest.fn(),
  discoverAccounts: jest.fn(),
};

jest.mock('../Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  getSnapKeyring: () => mockSnapKeyring,
  context: {
    AccountsController: {
      getNextAvailableAccountName: jest.fn().mockReturnValue('Snap Account 1'),
    },
  },
}));

const createMockKeyringClient = () => ({
  listAccounts: jest.fn(),
  getAccount: jest.fn(),
  getAccountBalances: jest.fn(),
  createAccount: jest.fn(),
  discoverAccounts: jest.fn(),
});

let mockKeyringClient = createMockKeyringClient();

jest.mock('@metamask/keyring-snap-client', () => ({
  KeyringClient: jest.fn().mockImplementation(() => mockKeyringClient),
  Sender: jest.fn(),
}));

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
    mockKeyringClient = createMockKeyringClient();
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
      const mockOptions = {};
      const mockCallback = async (keyring: SnapKeyring) => {
        await keyring.createAccount(
          mockSnapId,
          mockOptions,
          mockSnapKeyringOptions,
        );
      };

      await client.testWithSnapKeyring(mockCallback);

      expect(mockSnapKeyring.createAccount).toHaveBeenCalledWith(
        mockSnapId,
        mockOptions,
        mockSnapKeyringOptions,
      );
    });

    it('handles errors from the controller messenger', async () => {
      const mockError = new Error('Test error');
      const mockCallback = jest.fn().mockRejectedValueOnce(mockError);

      await expect(client.testWithSnapKeyring(mockCallback)).rejects.toThrow(
        'Test error',
      );
    });
  });

  describe('createAccount', () => {
    it('creates an account with the provided options', async () => {
      const mockOptions = {
        scope: SolScope.Mainnet,
        accountNameSuggestion: 'Solana Account 1',
        entropySource: 'test-entropy',
      };

      await client.createAccount(mockOptions);

      expect(mockSnapKeyring.createAccount).toHaveBeenCalledWith(
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
      const mockDiscoveredAccounts = [
        {
          type: 'bip44',
          scope: [SolScope.Mainnet],
          derivationPath: "m/44'/60'/0'/0",
        },
      ];

      mockKeyringClient.discoverAccounts.mockResolvedValueOnce(
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
      const expectAccountName = 'Solana Account ';
      const mockEntropySource = 'test-entropy';
      const mockDiscoveredAccounts = [
        {
          type: 'bip44',
          scope: [SolScope.Mainnet],
          derivationPath: "m/44'/60'/0'/0",
        },
      ];

      const mockKeyring = {
        createAccount: jest.fn(),
      };

      mockKeyringClient.discoverAccounts
        .mockResolvedValueOnce(mockDiscoveredAccounts)
        .mockResolvedValueOnce([]);

      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        async (_, __, callback) => {
          await callback({ keyring: mockKeyring });
        },
      );

      await client.addDiscoveredAccounts(mockEntropySource, SolScope.Mainnet);

      expect(mockSnapKeyring.createAccount).toHaveBeenCalledTimes(1);
      expect(mockSnapKeyring.createAccount).toHaveBeenCalledWith(
        mockSnapId,
        {
          accountNameSuggestion: expectAccountName,
          derivationPath: mockDiscoveredAccounts[0].derivationPath,
          entropySource: mockEntropySource,
          scope: SolScope.Mainnet,
        },
        expect.objectContaining({
          displayConfirmation: false,
          displayAccountNameSuggestion: false,
          setSelectedAccount: false,
        }),
      );
    });
  });
});

describe('MultichainWalletSnapFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('creates a TronWalletSnapClient', () => {
    const tronClient = MultichainWalletSnapFactory.createClient(
      WalletClientType.Tron,
    );
    expect(tronClient).toBeInstanceOf(TronWalletSnapClient);
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

describe('Wallet Client Implementations', () => {
  const mockSnapKeyringOptions = {
    displayConfirmation: false,
    displayAccountNameSuggestion: false,
    setSelectedAccount: false,
  };

  class TestBitcoinWalletSnapClient extends BitcoinWalletSnapClient {
    constructor() {
      super(mockSnapKeyringOptions);
    }

    public testGetSnapSender(): Sender {
      return this.getSnapSender();
    }
  }

  class TestSolanaWalletSnapClient extends SolanaWalletSnapClient {
    constructor() {
      super(mockSnapKeyringOptions);
    }

    public testGetSnapSender(): Sender {
      return this.getSnapSender();
    }
  }

  class TestTronWalletSnapClient extends TronWalletSnapClient {
    constructor() {
      super(mockSnapKeyringOptions);
    }

    public testGetSnapSender(): Sender {
      return this.getSnapSender();
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BitcoinWalletSnapClient', () => {
    it('should create a BitcoinWalletSnapClient', () => {
      const bitcoinClient = new BitcoinWalletSnapClient(mockSnapKeyringOptions);
      expect(bitcoinClient).toBeDefined();
    });

    it('should return Bitcoin client type', () => {
      const bitcoinClient = new BitcoinWalletSnapClient(mockSnapKeyringOptions);
      expect(bitcoinClient.getClientType()).toBe(WalletClientType.Bitcoin);
    });

    it('should return a BitcoinWalletSnapSender instance', () => {
      const bitcoinClient = new TestBitcoinWalletSnapClient();
      const sender = bitcoinClient.testGetSnapSender();
      expect(sender).toBeDefined();
      expect(sender).toBeInstanceOf(BitcoinWalletSnapSender);
    });
  });

  describe('SolanaWalletSnapClient', () => {
    it('should create a SolanaWalletSnapClient', () => {
      const solanaClient = new SolanaWalletSnapClient(mockSnapKeyringOptions);
      expect(solanaClient).toBeDefined();
    });

    it('should return Solana client type', () => {
      const solanaClient = new SolanaWalletSnapClient(mockSnapKeyringOptions);
      expect(solanaClient.getClientType()).toBe(WalletClientType.Solana);
    });

    it('should return a SolanaWalletSnapSender instance', () => {
      const solanaClient = new TestSolanaWalletSnapClient();
      const sender = solanaClient.testGetSnapSender();
      expect(sender).toBeDefined();
      expect(sender).toBeInstanceOf(SolanaWalletSnapSender);
    });
  });

  describe('TronWalletSnapClient', () => {
    it('should create a TronWalletSnapClient', () => {
      const tronClient = new TronWalletSnapClient(mockSnapKeyringOptions);
      expect(tronClient).toBeDefined();
    });

    it('should return Tron client type', () => {
      const tronClient = new TronWalletSnapClient(mockSnapKeyringOptions);
      expect(tronClient.getClientType()).toBe(WalletClientType.Tron);
    });

    it('should return a TronWalletSnapSender instance', () => {
      const tronClient = new TestTronWalletSnapClient();
      const sender = tronClient.testGetSnapSender();
      expect(sender).toBeDefined();
      expect(sender).toBeInstanceOf(TronWalletSnapSender);
    });

    it('should return the correct snap ID and name', () => {
      const tronClient = new TronWalletSnapClient(mockSnapKeyringOptions);
      expect(tronClient.getSnapId()).toBeDefined();
      expect(tronClient.getSnapName()).toBeDefined();
    });
  });
});
