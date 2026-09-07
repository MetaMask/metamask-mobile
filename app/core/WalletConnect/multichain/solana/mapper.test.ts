import { base58 } from 'ethers/lib/utils';
import type { CaipAccountId } from '@metamask/utils';
import {
  extractSignedTransaction,
  mapGetAccountsResponse,
  mapSignAndSendTransactionRequest,
  mapSignAndSendTransactionResponse,
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
  resolveSignerAddress,
  walletConnectMessageToSnapBase64,
} from './mapper';

const CONNECTED_ADDRESSES = [
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:AddrA',
] as CaipAccountId[];

describe('multichain/solana - mapper', () => {
  describe('resolveSignerAddress', () => {
    it('prefers the pubkey from the request', () => {
      expect(
        resolveSignerAddress({
          pubkey: 'ExplicitAddr',
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toBe('ExplicitAddr');
    });

    it('falls back to the first connected account', () => {
      expect(
        resolveSignerAddress({
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toBe('AddrA');
    });

    it('throws when no signer can be resolved', () => {
      expect(() => resolveSignerAddress({ connectedAddresses: [] })).toThrow(
        'No Solana account available to sign this request',
      );
    });
  });

  describe('walletConnectMessageToSnapBase64', () => {
    it('converts a base58 WalletConnect message to base64', () => {
      const encoded = base58.encode(Buffer.from('hello', 'utf8'));

      expect(walletConnectMessageToSnapBase64(encoded)).toBe(
        Buffer.from('hello', 'utf8').toString('base64'),
      );
    });
  });

  describe('inbound request mappers', () => {
    it('maps solana_signMessage to snap signMessage with a base64 payload', () => {
      const encoded = base58.encode(Buffer.from('hello', 'utf8'));

      expect(
        mapSignMessageRequest({
          params: { message: encoded, pubkey: 'AddrA' },
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toStrictEqual({
        method: 'signMessage',
        params: {
          account: { address: 'AddrA' },
          message: Buffer.from('hello', 'utf8').toString('base64'),
        },
      });
    });

    it('maps solana_signTransaction to snap signTransaction', () => {
      expect(
        mapSignTransactionRequest({
          params: { transaction: 'base64tx', pubkey: 'AddrA' },
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toStrictEqual({
        method: 'signTransaction',
        params: {
          account: { address: 'AddrA' },
          transaction: 'base64tx',
        },
      });
    });

    it('defaults signAndSendTransaction preflightCommitment to confirmed', () => {
      expect(
        mapSignAndSendTransactionRequest({
          params: { transaction: 'base64tx', pubkey: 'AddrA' },
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toStrictEqual({
        method: 'signAndSendTransaction',
        params: {
          account: { address: 'AddrA' },
          transaction: 'base64tx',
          options: { preflightCommitment: 'confirmed' },
        },
      });
    });

    it('forwards WalletConnect sendOptions over the confirmed default', () => {
      expect(
        mapSignAndSendTransactionRequest({
          params: {
            transaction: 'base64tx',
            pubkey: 'AddrA',
            sendOptions: {
              skipPreflight: true,
              preflightCommitment: 'processed',
            },
          },
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toStrictEqual({
        method: 'signAndSendTransaction',
        params: {
          account: { address: 'AddrA' },
          transaction: 'base64tx',
          options: {
            preflightCommitment: 'processed',
            skipPreflight: true,
          },
        },
      });
    });
  });

  describe('outbound response mappers', () => {
    it('forwards the snap message signature', () => {
      expect(mapSignMessageResponse({ signature: 'sig' })).toStrictEqual({
        signature: 'sig',
      });
    });

    it('prefers the signed transaction when the snap returns both fields', () => {
      expect(
        mapSignTransactionResponse({
          transaction: 'signedTx',
          signature: 'sig',
        }),
      ).toStrictEqual({
        transaction: 'signedTx',
        signature: 'sig',
      });
    });

    it('forwards the send signature', () => {
      expect(
        mapSignAndSendTransactionResponse({ signature: 'txid' }),
      ).toStrictEqual({ signature: 'txid' });
    });

    it('maps connected accounts to WalletConnect pubkey objects', () => {
      expect(mapGetAccountsResponse(CONNECTED_ADDRESSES)).toStrictEqual([
        { pubkey: 'AddrA' },
      ]);
    });

    it('extracts the signed transaction for signAllTransactions', () => {
      expect(extractSignedTransaction({ transaction: 'signedTx' })).toBe(
        'signedTx',
      );
    });

    it('throws when the snap omits the signed transaction', () => {
      expect(() => extractSignedTransaction({ signature: 'sig' })).toThrow(
        'Solana snap did not return a signed transaction for solana_signAllTransactions',
      );
    });
  });
});
