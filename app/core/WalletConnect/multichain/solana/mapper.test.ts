import { base58 } from 'ethers/lib/utils';
import type { CaipAccountId } from '@metamask/utils';
import {
  extractSignedTransaction,
  mapGetAccountsResponse,
  mapSignAndSendTransactionRequest,
  mapSignatureResponse,
  mapSignMessageRequest,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
  resolveSignerAddress,
  walletConnectMessageToSnapBase64,
} from './mapper';

const CONNECTED_ADDRESSES = [
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:AddrA',
] as CaipAccountId[];

const HELLO_BASE58 = base58.encode(Buffer.from('hello', 'utf8'));
const HELLO_BASE64 = Buffer.from('hello', 'utf8').toString('base64');

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
        resolveSignerAddress({ connectedAddresses: CONNECTED_ADDRESSES }),
      ).toBe('AddrA');
    });

    it('throws when no signer can be resolved', () => {
      expect(() => resolveSignerAddress({ connectedAddresses: [] })).toThrow(
        'No Solana account available to sign this request',
      );
    });
  });

  it('converts a base58 WalletConnect message to base64', () => {
    expect(walletConnectMessageToSnapBase64(HELLO_BASE58)).toBe(HELLO_BASE64);
  });

  describe('inbound request mappers', () => {
    it('maps solana_signMessage to a base64 snap payload', () => {
      expect(
        mapSignMessageRequest({
          params: { message: HELLO_BASE58, pubkey: 'AddrA' },
          connectedAddresses: CONNECTED_ADDRESSES,
        }),
      ).toStrictEqual({
        method: 'signMessage',
        params: { account: { address: 'AddrA' }, message: HELLO_BASE64 },
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
        params: { account: { address: 'AddrA' }, transaction: 'base64tx' },
      });
    });

    it('defaults signAndSendTransaction preflight to confirmed', () => {
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

    it('lets dapp sendOptions override the confirmed default', () => {
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
          options: { preflightCommitment: 'processed', skipPreflight: true },
        },
      });
    });
  });

  describe('outbound response mappers', () => {
    it('rebuilds the signature response without snap-internal fields', () => {
      const snapResult = { signature: 'sig', internalId: 'x' };

      expect(mapSignatureResponse(snapResult)).toStrictEqual({
        signature: 'sig',
      });
    });

    it('prefers the signed transaction when the snap returns both fields', () => {
      expect(
        mapSignTransactionResponse({
          transaction: 'signedTx',
          signature: 'sig',
        }),
      ).toStrictEqual({ transaction: 'signedTx', signature: 'sig' });
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
