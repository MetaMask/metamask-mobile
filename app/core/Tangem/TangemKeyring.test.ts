import { TangemKeyring } from './TangemKeyring';
import type { TangemNfcBridge } from './TangemNfcBridge';

const MOCK_CARD_ID = 'CB79000000012345';
const MOCK_MASTER_KEY =
  '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
const MOCK_DERIVED_KEY =
  '04c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee51ae168fea63dc339a3c58419466ceaeef7f632653266d0e1236431a950cfe52a';

const createMockBridge = (): jest.Mocked<TangemNfcBridge> =>
  ({
    scanCard: jest.fn().mockResolvedValue({
      cardId: MOCK_CARD_ID,
      wallets: [
        {
          publicKey: MOCK_MASTER_KEY,
          curve: 'secp256k1',
          settings: { isPermanent: false },
          index: 0,
          derivedKeys: {
            "m/44'/60'/0'/0/0": { publicKey: MOCK_DERIVED_KEY },
          },
        },
      ],
    }),
    signHash: jest.fn().mockResolvedValue({
      cardId: MOCK_CARD_ID,
      signature:
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      totalSignedHashes: 1,
    }),
    signHashes: jest.fn(),
    createWallet: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getNfcStatus: jest.fn().mockResolvedValue({ enabled: true, support: true }),
  }) as unknown as jest.Mocked<TangemNfcBridge>;

describe('TangemKeyring', () => {
  let keyring: TangemKeyring;
  let bridge: jest.Mocked<TangemNfcBridge>;

  beforeEach(() => {
    bridge = createMockBridge();
    keyring = new TangemKeyring({ bridge });
  });

  describe('type', () => {
    it('has the correct static type', () => {
      expect(TangemKeyring.type).toBe('Tangem Hardware');
    });

    it('has the correct instance type', () => {
      expect(keyring.type).toBe('Tangem Hardware');
    });
  });

  describe('serialize/deserialize', () => {
    it('serializes empty state', async () => {
      const state = await keyring.serialize();
      expect(state).toEqual({
        cardId: '',
        walletPublicKey: '',
        derivedPublicKey: '',
        accounts: [],
        accountDetails: {},
        hdPath: "m/44'/60'/0'/0",
        page: 0,
      });
    });

    it('round-trips state through serialize/deserialize', async () => {
      keyring.cardId = MOCK_CARD_ID;
      keyring.walletPublicKey = MOCK_MASTER_KEY;
      keyring.derivedPublicKey = MOCK_DERIVED_KEY;
      keyring.accounts = ['0xabc123' as `0x${string}`];
      keyring.accountDetails = {
        '0xabc123': {
          hdPath: "m/44'/60'/0'/0/0",
          walletPublicKey: MOCK_MASTER_KEY,
          index: 0,
        },
      };

      const serialized = await keyring.serialize();
      const newKeyring = new TangemKeyring({ bridge });
      await newKeyring.deserialize(serialized);

      expect(newKeyring.cardId).toBe(MOCK_CARD_ID);
      expect(newKeyring.walletPublicKey).toBe(MOCK_MASTER_KEY);
      expect(newKeyring.derivedPublicKey).toBe(MOCK_DERIVED_KEY);
      expect(newKeyring.accounts).toEqual(['0xabc123']);
    });
  });

  describe('getAccounts', () => {
    it('returns empty array initially', async () => {
      const accounts = await keyring.getAccounts();
      expect(accounts).toEqual([]);
    });

    it('returns accounts after adding them', async () => {
      await keyring.addAccounts(1);
      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatch(/^0x/);
    });
  });

  describe('addAccounts', () => {
    it('scans card if not yet scanned', async () => {
      await keyring.addAccounts(1);
      expect(bridge.scanCard).toHaveBeenCalled();
      expect(keyring.cardId).toBe(MOCK_CARD_ID);
      expect(keyring.walletPublicKey).toBe(MOCK_MASTER_KEY);
      expect(keyring.derivedPublicKey).toBe(MOCK_DERIVED_KEY);
    });

    it('does not re-scan if card already scanned', async () => {
      keyring.cardId = MOCK_CARD_ID;
      keyring.walletPublicKey = MOCK_MASTER_KEY;
      keyring.derivedPublicKey = MOCK_DERIVED_KEY;
      await keyring.addAccounts(1);
      expect(bridge.scanCard).not.toHaveBeenCalled();
    });

    it('throws if no secp256k1 wallet on card', async () => {
      bridge.scanCard.mockResolvedValueOnce({
        cardId: MOCK_CARD_ID,
        wallets: [
          {
            publicKey: 'deadbeef',
            curve: 'ed25519',
            settings: { isPermanent: false },
            index: 0,
          },
        ],
      } as ReturnType<TangemNfcBridge['scanCard']> extends Promise<infer T>
        ? T
        : never);

      await expect(keyring.addAccounts(1)).rejects.toThrow(
        'No secp256k1 wallet found',
      );
    });
  });

  describe('removeAccount', () => {
    it('removes an account by address', async () => {
      await keyring.addAccounts(1);
      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);

      keyring.removeAccount(accounts[0]);
      const remaining = await keyring.getAccounts();
      expect(remaining).toHaveLength(0);
    });
  });

  describe('setAccountToUnlock', () => {
    it('sets the account index for next unlock', () => {
      keyring.setAccountToUnlock(5);
      expect(keyring.unlockedAccount).toBe(5);
    });
  });

  describe('signMessage', () => {
    it('calls bridge.signHash with correct parameters', async () => {
      keyring.cardId = MOCK_CARD_ID;
      keyring.walletPublicKey = MOCK_MASTER_KEY;
      keyring.derivedPublicKey = MOCK_DERIVED_KEY;
      const address =
        '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`;
      keyring.accounts = [address];
      keyring.accountDetails = {
        [address]: {
          hdPath: "m/44'/60'/0'/0/0",
          walletPublicKey: MOCK_MASTER_KEY,
          index: 0,
        },
      };

      const result = await keyring.signMessage(address, '0xdeadbeef');
      expect(bridge.signHash).toHaveBeenCalledWith(
        'deadbeef',
        MOCK_MASTER_KEY,
        MOCK_CARD_ID,
        "m/44'/60'/0'/0/0",
      );
      expect(result).toMatch(/^0x/);
    });

    it('throws for unknown address', async () => {
      await expect(
        keyring.signMessage('0xunknown' as `0x${string}`, '0xdeadbeef'),
      ).rejects.toThrow('account 0xunknown not found');
    });
  });

  describe('forgetDevice', () => {
    it('resets all keyring state', async () => {
      await keyring.addAccounts(1);
      expect(keyring.cardId).toBe(MOCK_CARD_ID);

      keyring.forgetDevice();
      expect(keyring.cardId).toBe('');
      expect(keyring.walletPublicKey).toBe('');
      expect(keyring.accounts).toEqual([]);
      expect(keyring.accountDetails).toEqual({});
    });
  });

  describe('isConnected', () => {
    it('returns false initially', () => {
      expect(keyring.isConnected()).toBe(false);
    });

    it('returns true after scanning card', async () => {
      await keyring.addAccounts(1);
      expect(keyring.isConnected()).toBe(true);
    });
  });

  describe('getFirstPage/getNextPage/getPreviousPage', () => {
    it('returns single account derived from the child key', async () => {
      const page = await keyring.getFirstPage();
      expect(page).toHaveLength(1);
      expect(page[0]).toHaveProperty('address');
      expect(page[0]).toHaveProperty('balance', null);
      expect(page[0]).toHaveProperty('index', 0);
    });

    it('getNextPage returns empty (single-account model)', async () => {
      await keyring.getFirstPage();
      const nextPage = await keyring.getNextPage();
      expect(nextPage).toEqual([]);
    });

    it('getPreviousPage resets to first page', async () => {
      await keyring.getFirstPage();
      const prevPage = await keyring.getPreviousPage();
      expect(prevPage).toHaveLength(1);
      expect(keyring.page).toBe(0);
    });
  });
});
