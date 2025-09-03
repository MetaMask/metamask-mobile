import {
  BitcoinWalletSnapClient,
  MultichainWalletSnapClient,
  MultichainWalletSnapFactory,
  SolanaWalletSnapClient,
  WalletClientType,
} from './MultichainWalletSnapClient';
import { CaipChainId, SnapId } from '@metamask/snaps-sdk';
import Engine from '../Engine';
import { Sender } from '@metamask/keyring-snap-client';
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { SolScope } from '@metamask/keyring-api';

const mockSnapKeyring = {
  createAccount: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BitcoinWalletSnapClient', () => {
    it('should create a BitcoinWalletSnapClient', () => {
      const bitcoinClient = new BitcoinWalletSnapClient(mockSnapKeyringOptions);
      expect(bitcoinClient).toBeDefined();
    });
  });

  describe('SolanaWalletSnapClient', () => {
    it('should create a SolanaWalletSnapClient', () => {
      const solanaClient = new SolanaWalletSnapClient(mockSnapKeyringOptions);
      expect(solanaClient).toBeDefined();
    });
  });
});
