import { SolScope } from '@metamask/keyring-api';
import { HandlerType } from '@metamask/snaps-utils';

import { SOLANA_WALLET_SNAP_ID } from '../../../../../../core/SnapKeyring/SolanaWalletSnap';
import {
  buildSignTransactionRequest,
  isSnapMethodUnsupported,
  signSolanaTransactionSilently,
  type SnapRequestFn,
} from './solanaSnap';

const ACCOUNT_ID = '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91';
const TRANSACTION = 'provider-transaction';
const SIGNED = 'snap-signed-transaction';
const SIGNATURE = 'transaction-signature';

const setup = (implementation: SnapRequestFn) => {
  const request = jest.fn(implementation);
  const sign = () =>
    signSolanaTransactionSilently(request, {
      accountId: ACCOUNT_ID,
      transaction: TRANSACTION,
    });
  return { request, sign };
};

describe('buildSignTransactionRequest', () => {
  it('targets the Solana snap client request handler', () => {
    const args = buildSignTransactionRequest({
      accountId: ACCOUNT_ID,
      transaction: TRANSACTION,
    });

    expect(args).toStrictEqual({
      origin: 'metamask',
      snapId: SOLANA_WALLET_SNAP_ID,
      handler: HandlerType.OnClientRequest,
      request: {
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'signTransaction',
        params: {
          accountId: ACCOUNT_ID,
          transaction: TRANSACTION,
          scope: SolScope.Mainnet,
        },
      },
    });
  });

  it('uses a new request id each time', () => {
    const params = { accountId: ACCOUNT_ID, transaction: TRANSACTION };

    const first = buildSignTransactionRequest(params);
    const second = buildSignTransactionRequest(params);

    expect(first.request.id).not.toBe(second.request.id);
  });
});

describe('isSnapMethodUnsupported', () => {
  it.each([
    ['a method not found code', { code: -32601, message: 'x' }],
    ['a nested method not found code', { data: { cause: { code: -32601 } } }],
    ['a method not found message', new Error('Method not found')],
    [
      'an unsupported method message',
      new Error('The method "signTransaction" does not exist'),
    ],
  ])('detects %s', (_label, error) => {
    expect(isSnapMethodUnsupported(error)).toBe(true);
  });

  it.each([
    ['a user rejection', new Error('User rejected the request')],
    ['an invalid params error', { code: -32602, message: 'Invalid params' }],
    ['a non error value', undefined],
  ])('ignores %s', (_label, error) => {
    expect(isSnapMethodUnsupported(error)).toBe(false);
  });
});

describe('signSolanaTransactionSilently', () => {
  it('returns the signed transaction and its signature', async () => {
    const { request, sign } = setup(async () => ({
      signedTransaction: SIGNED,
      signature: SIGNATURE,
    }));

    const result = await sign();

    expect(result).toStrictEqual({
      signedTransaction: SIGNED,
      signature: SIGNATURE,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({
      handler: HandlerType.OnClientRequest,
      request: {
        method: 'signTransaction',
        params: { accountId: ACCOUNT_ID, transaction: TRANSACTION },
      },
    });
  });

  it('rejects a snap response without the signed transaction', async () => {
    const { sign } = setup(async () => ({ signature: SIGNATURE }));

    await expect(sign()).rejects.toMatchObject({
      code: 'SIGNING_REJECTED',
      message: 'Solana snap signTransaction: invalid response',
    });
  });

  it('maps a snap without the method to SNAP_UNSUPPORTED', async () => {
    const snapError = Object.assign(new Error('Method not found'), {
      code: -32601,
    });
    const { sign } = setup(async () => {
      throw snapError;
    });

    await expect(sign()).rejects.toMatchObject({
      code: 'SNAP_UNSUPPORTED',
      retryable: false,
      cause: snapError,
    });
  });

  it('maps any other snap failure to SIGNING_REJECTED', async () => {
    const { sign } = setup(async () => {
      throw Object.assign(new Error('Internal error'), {
        data: { cause: { message: 'account is not a required signer' } },
      });
    });

    await expect(sign()).rejects.toMatchObject({
      code: 'SIGNING_REJECTED',
      retryable: false,
      message: 'Internal error: account is not a required signer',
    });
  });
});
