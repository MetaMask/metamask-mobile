import { SolScope } from '@metamask/keyring-api';
import { base58 } from 'ethers/lib/utils';
import {
  mapAccountRequest,
  mapSignAndSendTransactionRequest,
  mapSignAndSendTransactionResponse,
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';

jest.mock('@solana/transactions', () => ({
  getTransactionDecoder: () => ({
    decode: (bytes: Uint8Array) => ({ __bytes: bytes }),
  }),
  getSignatureFromTransaction: jest.fn(() => 'extracted-base58-signature'),
}));

const MAINNET_CAIP_ACCOUNT_A = `${SolScope.Mainnet}:SolAddrA` as const;
const MAINNET_CAIP_ACCOUNT_B = `${SolScope.Mainnet}:SolAddrB` as const;

describe('multichain/solana - mapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapAccountRequest', () => {
    it('maps CAIP-10 account ids to WalletConnect Solana account objects', () => {
      expect(
        mapAccountRequest({
          connectedAddresses: [MAINNET_CAIP_ACCOUNT_A, MAINNET_CAIP_ACCOUNT_B],
        }),
      ).toStrictEqual([{ pubkey: 'SolAddrA' }, { pubkey: 'SolAddrB' }]);
    });
  });

  describe('inbound request mappers', () => {
    it('maps solana_signMessage with base58 message to canonical signMessage payload', () => {
      const messageBytes = Buffer.from('hello world', 'utf8');
      const base58Message = base58.encode(messageBytes);

      expect(
        mapSignMessageRequest({
          params: { pubkey: 'SolAddrA', message: base58Message },
        }),
      ).toStrictEqual({
        method: 'signMessage',
        params: {
          account: { address: 'SolAddrA' },
          message: messageBytes.toString('base64'),
        },
      });
    });

    it('maps solana_signTransaction to canonical signTransaction payload using the first connected CAIP account', () => {
      expect(
        mapSignTransactionRequest({
          params: { transaction: 'base64-tx' },
          scope: SolScope.Mainnet,
          connectedAddresses: [MAINNET_CAIP_ACCOUNT_A, MAINNET_CAIP_ACCOUNT_B],
        }),
      ).toStrictEqual({
        method: 'signTransaction',
        params: {
          account: { address: 'SolAddrA' },
          transaction: 'base64-tx',
          scope: SolScope.Mainnet,
        },
      });
    });

    it('maps solana_signAndSendTransaction to canonical signAndSendTransaction payload', () => {
      expect(
        mapSignAndSendTransactionRequest({
          params: {
            transaction: 'base64-tx',
            sendOptions: { skipPreflight: true, minContextSlot: 123 },
          },
          scope: SolScope.Mainnet,
          connectedAddresses: [MAINNET_CAIP_ACCOUNT_A],
        }),
      ).toStrictEqual({
        method: 'signAndSendTransaction',
        params: {
          account: { address: 'SolAddrA' },
          transaction: 'base64-tx',
          scope: SolScope.Mainnet,
          options: { skipPreflight: true, minContextSlot: 123 },
        },
      });
    });
  });

  describe('outbound response mappers', () => {
    it('maps solana_signMessage Snap signature to the WalletConnect signMessage response', () => {
      expect(mapSignMessageResponse({ signature: 'base58-sig' })).toStrictEqual(
        { signature: 'base58-sig' },
      );
    });

    it('maps solana_signTransaction Snap signedTransaction to spec-compliant { signature, transaction }', () => {
      expect(
        mapSignTransactionResponse({ signedTransaction: 'c2lnbmVkLXR4' }),
      ).toStrictEqual({
        signature: 'extracted-base58-signature',
        transaction: 'c2lnbmVkLXR4',
      });
    });

    it('maps solana_signAndSendTransaction Snap signature to the WalletConnect signature response', () => {
      expect(
        mapSignAndSendTransactionResponse({ signature: 'base58-txid' }),
      ).toStrictEqual({ signature: 'base58-txid' });
    });
  });
});
