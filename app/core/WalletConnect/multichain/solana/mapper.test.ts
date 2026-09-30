import { base58 } from 'ethers/lib/utils';
import type { CaipAccountId, CaipChainId } from '@metamask/utils';
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

const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
const CONNECTED_ADDRESSES = [
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:AddrA',
] as CaipAccountId[];

const HELLO_BASE58 = base58.encode(Buffer.from('hello', 'utf8'));
const HELLO_BASE64 = Buffer.from('hello', 'utf8').toString('base64');

const FEE_PAYER = base58.encode(Buffer.alloc(32, 1));
const CO_SIGNER = base58.encode(Buffer.alloc(32, 2));
const CO_SIGNER_SIGNATURE = Buffer.alloc(64, 7);
// Legacy wire format: fee payer slot unsigned, co-signer slot signed.
const SIGNED_TX = Buffer.concat([
  Buffer.from([2]),
  Buffer.alloc(64),
  CO_SIGNER_SIGNATURE,
  Buffer.from([2, 0, 0, 2]),
  Buffer.alloc(32, 1),
  Buffer.alloc(32, 2),
  Buffer.alloc(32),
  Buffer.from([0]),
]).toString('base64');

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
          scope: SOLANA_MAINNET,
        }),
      ).toStrictEqual({
        method: 'signTransaction',
        params: {
          account: { address: 'AddrA' },
          transaction: 'base64tx',
          scope: SOLANA_MAINNET,
        },
      });
    });

    it('defaults signAndSendTransaction preflight to confirmed', () => {
      expect(
        mapSignAndSendTransactionRequest({
          params: { transaction: 'base64tx', pubkey: 'AddrA' },
          connectedAddresses: CONNECTED_ADDRESSES,
          scope: SOLANA_MAINNET,
        }),
      ).toStrictEqual({
        method: 'signAndSendTransaction',
        params: {
          account: { address: 'AddrA' },
          transaction: 'base64tx',
          scope: SOLANA_MAINNET,
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
          scope: SOLANA_MAINNET,
        }),
      ).toStrictEqual({
        method: 'signAndSendTransaction',
        params: {
          account: { address: 'AddrA' },
          transaction: 'base64tx',
          scope: SOLANA_MAINNET,
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

    it('returns the signed transaction and the signer signature', () => {
      expect(
        mapSignTransactionResponse({
          result: { signedTransaction: SIGNED_TX },
          signerAddress: CO_SIGNER,
        }),
      ).toStrictEqual({
        transaction: SIGNED_TX,
        signature: base58.encode(CO_SIGNER_SIGNATURE),
      });
    });

    it('throws when the signer slot is unsigned', () => {
      expect(() =>
        mapSignTransactionResponse({
          result: { signedTransaction: SIGNED_TX },
          signerAddress: FEE_PAYER,
        }),
      ).toThrow('Solana snap did not sign the transaction for the signer');
    });

    it('maps connected accounts to WalletConnect pubkey objects', () => {
      expect(mapGetAccountsResponse(CONNECTED_ADDRESSES)).toStrictEqual([
        { pubkey: 'AddrA' },
      ]);
    });

    it('extracts the signed transaction for signAllTransactions', () => {
      expect(extractSignedTransaction({ signedTransaction: 'signedTx' })).toBe(
        'signedTx',
      );
    });

    it('throws when the snap omits the signed transaction', () => {
      expect(() =>
        extractSignedTransaction(
          {} as Parameters<typeof extractSignedTransaction>[0],
        ),
      ).toThrow('Solana snap did not return a signed transaction');
    });
  });
});
