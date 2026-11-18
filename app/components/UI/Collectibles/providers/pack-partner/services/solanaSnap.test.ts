import { SolScope } from '@metamask/keyring-api';
import { HandlerType } from '@metamask/snaps-utils';

import { SOLANA_WALLET_SNAP_ID } from '../../../../../../core/SnapKeyring/SolanaWalletSnap';
import {
  buildSignPackPartnerBuyRequest,
  buildSignPackPartnerBuybackRequest,
  isSnapMethodUnsupported,
  signPackPartnerBuy,
  signPackPartnerBuyback,
  type SnapRequestFn,
} from './solanaSnap';

let mockScope: string = SolScope.Mainnet;

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  get PACK_PARTNER_SCOPE() {
    return mockScope;
  },
}));

afterEach(() => {
  mockScope = SolScope.Mainnet;
});

const ACCOUNT_ID = '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91';
const TRANSACTION = 'cHJlc2lnbmVkLXRyYW5zYWN0aW9u';
const SIGNED = 'snap-signed-transaction';
const SIGNATURE = 'transaction-signature';
const ASSET_ADDRESS = '11111111111111111111111111111111';
const BUY_PARAMS = {
  accountId: ACCOUNT_ID,
  transaction: TRANSACTION,
  amount: '25000000',
};
const BUYBACK_PARAMS = {
  ...BUY_PARAMS,
  assetAddress: ASSET_ADDRESS,
  expectedStandard: 'core' as const,
};

const operations = [
  {
    name: 'buy',
    method: 'signPackPartnerBuy',
    context: { amount: BUY_PARAMS.amount },
    buildRequest: () => buildSignPackPartnerBuyRequest(BUY_PARAMS),
    sign: (request: SnapRequestFn) => signPackPartnerBuy(request, BUY_PARAMS),
  },
  {
    name: 'buyback',
    method: 'signPackPartnerBuyback',
    context: {
      amount: BUYBACK_PARAMS.amount,
      assetAddress: ASSET_ADDRESS,
      expectedStandard: 'core',
    },
    buildRequest: () => buildSignPackPartnerBuybackRequest(BUYBACK_PARAMS),
    sign: (request: SnapRequestFn) =>
      signPackPartnerBuyback(request, BUYBACK_PARAMS),
  },
] as const;

describe.each(operations)('$name signing', (operation) => {
  it('sends the confirmed intent to the Solana Snap client handler', () => {
    expect(operation.buildRequest()).toStrictEqual({
      origin: 'metamask',
      snapId: SOLANA_WALLET_SNAP_ID,
      handler: HandlerType.OnClientRequest,
      request: {
        jsonrpc: '2.0',
        id: expect.any(String),
        method: operation.method,
        params: {
          accountId: ACCOUNT_ID,
          transaction: TRANSACTION,
          scope: SolScope.Mainnet,
          context: operation.context,
        },
      },
    });
  });

  it('uses a new request id each time', () => {
    const first = operation.buildRequest();
    const second = operation.buildRequest();

    expect(first.request.id).not.toBe(second.request.id);
  });

  it('returns the signed transaction and its signature', async () => {
    const request = jest.fn(async (_args: Parameters<SnapRequestFn>[0]) => ({
      signedTransaction: SIGNED,
      signature: SIGNATURE,
    }));

    const result = await operation.sign(request);

    expect(result).toStrictEqual({
      signedTransaction: SIGNED,
      signature: SIGNATURE,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({
      handler: HandlerType.OnClientRequest,
      request: {
        method: operation.method,
        params: {
          accountId: ACCOUNT_ID,
          transaction: TRANSACTION,
          context: operation.context,
        },
      },
    });
  });

  it('rejects a response without the signed transaction', async () => {
    const request = jest.fn(async () => ({ signature: SIGNATURE }));

    await expect(operation.sign(request)).rejects.toMatchObject({
      code: 'SIGNING_REJECTED',
    });
  });

  it('maps a Snap without the method to SNAP_UNSUPPORTED', async () => {
    const snapError = Object.assign(new Error('Method not found'), {
      code: -32601,
    });
    const request = jest.fn(async () => {
      throw snapError;
    });

    await expect(operation.sign(request)).rejects.toMatchObject({
      code: 'SNAP_UNSUPPORTED',
      retryable: false,
      message: 'Solana snap: SNAP_UNSUPPORTED',
    });
  });

  it('maps other validation or signing failures to SIGNING_REJECTED', async () => {
    const request = jest.fn(async () => {
      throw Object.assign(new Error('Invalid params'), {
        data: {
          cause: { message: 'USDC transfer does not match confirmed intent' },
        },
      });
    });

    await expect(operation.sign(request)).rejects.toMatchObject({
      code: 'SIGNING_REJECTED',
      retryable: false,
      message: 'Solana snap: SIGNING_REJECTED',
    });
  });

  it.each([
    new Error('NFT standard is not supported for silent buyback signing'),
    {
      message: 'An error occurred while signing',
      data: {
        cause: {
          message: 'NFT standard is not supported for silent buyback signing',
        },
      },
    },
  ])(
    'keeps unsupported NFT guards distinct from a missing Snap method (%#)',
    async (error) => {
      const request = jest.fn(async () => {
        throw error;
      });

      await expect(operation.sign(request)).rejects.toMatchObject({
        code: 'SIGNING_REJECTED',
        retryable: false,
      });
    },
  );
});

describe('compressed NFT buybacks', () => {
  it.each([SolScope.Mainnet, SolScope.Devnet])(
    'passes the compressed asset ID and base-unit refund unchanged on %s',
    (scope) => {
      mockScope = scope;

      const request = buildSignPackPartnerBuybackRequest({
        ...BUYBACK_PARAMS,
        expectedStandard: 'cnft-core',
      });

      expect(request).toMatchObject({
        handler: HandlerType.OnClientRequest,
        request: {
          method: 'signPackPartnerBuyback',
          params: {
            accountId: ACCOUNT_ID,
            scope,
            transaction: TRANSACTION,
            context: {
              amount: BUYBACK_PARAMS.amount,
              assetAddress: ASSET_ADDRESS,
              expectedStandard: 'cnft-core',
            },
          },
        },
      });
    },
  );
});

describe('isSnapMethodUnsupported', () => {
  it.each([
    ['a method not found code', { code: -32601, message: 'x' }],
    ['a nested method not found code', { data: { cause: { code: -32601 } } }],
    ['a method not found message', new Error('Method not found')],
    [
      'an unsupported method message',
      new Error('The method "signPackPartnerBuy" does not exist'),
    ],
    [
      'a named unsupported buyback method',
      new Error('The method "signPackPartnerBuyback" is not supported'),
    ],
  ])('detects %s', (_label, error) => {
    expect(isSnapMethodUnsupported(error)).toBe(true);
  });

  it.each([
    ['a user rejection', new Error('User rejected the request')],
    ['an invalid params error', { code: -32602, message: 'Invalid params' }],
    ['a non error value', undefined],
    [
      'an unsupported NFT standard',
      new Error('NFT standard is not supported for silent buyback signing'),
    ],
    ['an absent account', new Error('Account does not exist')],
    ['an unsupported network', new Error('Network is not supported')],
  ])('ignores %s', (_label, error) => {
    expect(isSnapMethodUnsupported(error)).toBe(false);
  });
});
