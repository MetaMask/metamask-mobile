import {
  BitcoinWalletSnapClient,
  MultichainWalletSnapClient,
  SolanaWalletSnapClient,
  TronWalletSnapClient,
  WalletClientType,
} from './MultichainWalletSnapClient';
import { CaipChainId, SnapId } from '@metamask/snaps-sdk';
import { Sender } from '@metamask/keyring-snap-client';
import { SolScope } from '@metamask/keyring-api';
import { BitcoinWalletSnapSender } from './BitcoinWalletSnap';
import { SolanaWalletSnapSender } from './SolanaWalletSnap';
import { TronWalletSnapSender } from './TronWalletSnap';

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

  class TestMultichainWalletSnapClient extends MultichainWalletSnapClient {
    constructor() {
      super(mockSnapId, mockSnapName);
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
});

describe('Wallet Client Implementations', () => {
  class TestBitcoinWalletSnapClient extends BitcoinWalletSnapClient {
    public testGetSnapSender(): Sender {
      return this.getSnapSender();
    }
  }

  class TestSolanaWalletSnapClient extends SolanaWalletSnapClient {
    public testGetSnapSender(): Sender {
      return this.getSnapSender();
    }
  }

  class TestTronWalletSnapClient extends TronWalletSnapClient {
    public testGetSnapSender(): Sender {
      return this.getSnapSender();
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BitcoinWalletSnapClient', () => {
    it('should create a BitcoinWalletSnapClient', () => {
      const bitcoinClient = new BitcoinWalletSnapClient();
      expect(bitcoinClient).toBeDefined();
    });

    it('should return Bitcoin client type', () => {
      const bitcoinClient = new BitcoinWalletSnapClient();
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
      const solanaClient = new SolanaWalletSnapClient();
      expect(solanaClient).toBeDefined();
    });

    it('should return Solana client type', () => {
      const solanaClient = new SolanaWalletSnapClient();
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
      const tronClient = new TronWalletSnapClient();
      expect(tronClient).toBeDefined();
    });

    it('should return Tron client type', () => {
      const tronClient = new TronWalletSnapClient();
      expect(tronClient.getClientType()).toBe(WalletClientType.Tron);
    });

    it('should return a TronWalletSnapSender instance', () => {
      const tronClient = new TestTronWalletSnapClient();
      const sender = tronClient.testGetSnapSender();
      expect(sender).toBeDefined();
      expect(sender).toBeInstanceOf(TronWalletSnapSender);
    });

    it('should return the correct snap ID and name', () => {
      const tronClient = new TronWalletSnapClient();
      expect(tronClient.getSnapId()).toBeDefined();
      expect(tronClient.getSnapName()).toBeDefined();
    });
  });
});
