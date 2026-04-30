import tangemSdk from 'tangem-sdk-react-native';
import { TangemNfcBridge } from './TangemNfcBridge';

jest.mock('tangem-sdk-react-native', () => ({
  __esModule: true,
  default: {
    scanCard: jest.fn(),
    runJSONRPCRequest: jest.fn(),
    signHash: jest.fn(),
    signHashes: jest.fn(),
    createWallet: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getNFCStatus: jest.fn(),
  },
  EllipticCurve: {
    Secp256k1: 'secp256k1',
    Ed25519: 'ed25519',
    Secp256r1: 'secp256r1',
  },
}));

describe('TangemNfcBridge', () => {
  let bridge: TangemNfcBridge;

  beforeEach(() => {
    jest.resetAllMocks();
    bridge = new TangemNfcBridge();
  });

  describe('scanCard', () => {
    it('calls tangemSdk.scanCard and returns card with derived keys', async () => {
      const mockCard = {
        cardId: 'CB79000000012345',
        wallets: [
          {
            publicKey: 'masterkey',
            curve: 'secp256k1',
            derivedKeys: {
              "m/44'/60'/0'/0/0": { publicKey: 'derivedkey' },
            },
          },
        ],
      };
      tangemSdk.scanCard.mockResolvedValueOnce(mockCard);

      const result = await bridge.scanCard();
      expect(tangemSdk.scanCard).toHaveBeenCalledWith({
        header: 'MetaMask',
        body: 'Hold your Tangem card to the back of your phone',
      });
      expect(result).toEqual(mockCard);
    });
  });

  describe('signHash', () => {
    it('calls tangemSdk.signHash with correct parameters', async () => {
      const mockResponse = {
        cardId: 'CB79000000012345',
        signature: 'abc123',
        totalSignedHashes: 1,
      };
      tangemSdk.signHash.mockResolvedValueOnce(mockResponse);

      const result = await bridge.signHash(
        'deadbeef',
        'pubkey123',
        'CB79000000012345',
        "m/44'/60'/0'/0/0",
      );

      expect(tangemSdk.signHash).toHaveBeenCalledWith(
        'deadbeef',
        'pubkey123',
        'CB79000000012345',
        "m/44'/60'/0'/0/0",
        {
          header: 'MetaMask',
          body: 'Hold your Tangem card to sign the transaction',
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('unwraps array response', async () => {
      const mockResponse = {
        cardId: 'CB79000000012345',
        signature: 'abc123',
      };
      tangemSdk.signHash.mockResolvedValueOnce([mockResponse]);

      const result = await bridge.signHash(
        'deadbeef',
        'pubkey123',
        'CB79000000012345',
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('signHashes', () => {
    it('calls tangemSdk.signHashes with correct parameters', async () => {
      const mockResponse = {
        cardId: 'CB79000000012345',
        signatures: ['sig1', 'sig2'],
      };
      tangemSdk.signHashes.mockResolvedValueOnce(mockResponse);

      const result = await bridge.signHashes(
        ['hash1', 'hash2'],
        'pubkey123',
        'CB79000000012345',
      );

      expect(tangemSdk.signHashes).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createWallet', () => {
    it('calls tangemSdk.createWallet with secp256k1 curve', async () => {
      const mockResponse = {
        cardId: 'CB79000000012345',
        wallet: { publicKey: 'pk', curve: 'secp256k1' },
      };
      tangemSdk.createWallet.mockResolvedValueOnce(mockResponse);

      const result = await bridge.createWallet('CB79000000012345');
      expect(tangemSdk.createWallet).toHaveBeenCalledWith(
        'secp256k1',
        'CB79000000012345',
        expect.objectContaining({ header: 'MetaMask' }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getNfcStatus', () => {
    it('returns NFC status from SDK', async () => {
      tangemSdk.getNFCStatus.mockResolvedValueOnce({
        enabled: true,
        support: true,
      });

      const status = await bridge.getNfcStatus();
      expect(status).toEqual({ enabled: true, support: true });
    });
  });

  describe('session management', () => {
    it('delegates startSession to SDK', async () => {
      tangemSdk.startSession.mockResolvedValueOnce(undefined);
      await bridge.startSession();
      expect(tangemSdk.startSession).toHaveBeenCalled();
    });

    it('delegates stopSession to SDK', async () => {
      tangemSdk.stopSession.mockResolvedValueOnce(undefined);
      await bridge.stopSession();
      expect(tangemSdk.stopSession).toHaveBeenCalled();
    });
  });
});
