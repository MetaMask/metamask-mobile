/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { SignatureControllerMessenger } from '@metamask/signature-controller';
import { Hex } from '@metamask/utils';
import { handleIntentTransaction, signIntent } from './intent';
import { BridgeQuoteResponse } from '../../components/UI/Bridge/types';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  context: {
    BridgeStatusController: { submitIntent: jest.fn() },
  },
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockGetSignatureControllerMessenger = jest.fn();
jest.mock(
  '../../core/Engine/messengers/signature-controller-messenger',
  () => ({
    getSignatureControllerMessenger: (...args: unknown[]) =>
      mockGetSignatureControllerMessenger(...args),
  }),
);

const ACCOUNT = '0x1234567890123456789012345678901234567890' as Hex;
const VERIFYING_CONTRACT_DEFAULT =
  '0x9008D19f58AAbd9eD0D60971565AA8510560ab41' as Hex;
const CUSTOM_SETTLEMENT = '0x1111111111111111111111111111111111111111' as Hex;

const BASE_ORDER: Parameters<typeof signIntent>[0]['order'] = {
  sellToken: '0x0000000000000000000000000000000000000000' as Hex,
  buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
  receiver: ACCOUNT,
  sellAmount: '1000000000000000000',
  buyAmount: '2000000000',
  validTo: 1234567890,
  appData: '0x',
  appDataHash:
    '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
  feeAmount: '0',
  kind: 'sell',
  partiallyFillable: false,
  sellTokenBalance: 'erc20',
  buyTokenBalance: 'erc20',
};

const BASE_QUOTE: BridgeQuoteResponse = {
  requestId: 'test-request-id',
  srcChainId: 1,
  destChainId: 10,
  srcAsset: {
    chainId: 1,
    address: '0x123',
    decimals: 18,
    symbol: 'TOKEN1',
    name: 'Token One',
  },
  destAsset: {
    chainId: 10,
    address: '0x456',
    decimals: 18,
    symbol: 'TOKEN2',
    name: 'Token Two',
  },
  srcTokenAmount: '1000000000000000000',
  destTokenAmount: '2000000000000000000',
  aggregator: 'test-aggregator',
  walletAddress: ACCOUNT,
  quote: {
    requestId: 'test-request-id',
    srcChainId: 1,
    destChainId: 10,
    srcAsset: {
      chainId: 1,
      address: '0x123',
      decimals: 18,
      symbol: 'TOKEN1',
      name: 'Token One',
    },
    destAsset: {
      chainId: 10,
      address: '0x456',
      decimals: 18,
      symbol: 'TOKEN2',
      name: 'Token Two',
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '2000000000000000000',
    intent: {
      protocol: 'cowswap',
      order: {
        sellToken: BASE_ORDER.sellToken,
        buyToken: BASE_ORDER.buyToken,
        sellAmount: BASE_ORDER.sellAmount,
        buyAmount: BASE_ORDER.buyAmount,
        validTo: String(BASE_ORDER.validTo),
        appData: '0x',
        receiver: ACCOUNT,
      },
      settlementContract: VERIFYING_CONTRACT_DEFAULT,
    },
  },
} as unknown as BridgeQuoteResponse;

const makeSignatureMessenger = (): jest.Mocked<SignatureControllerMessenger> =>
  ({
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    publish: jest.fn(),
    registerActionHandler: jest.fn(),
    unregisterActionHandler: jest.fn(),
    clearEventSubscriptions: jest.fn(),
    registerInitialEventPayload: jest.fn(),
  }) as unknown as jest.Mocked<SignatureControllerMessenger>;

const deepMerge = <T extends object>(base: T, patch?: Partial<T>): T => {
  if (!patch) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && (base as any)[k]) {
      out[k] = deepMerge((base as any)[k], v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
};

const makeQuote = (
  overrides?: Partial<BridgeQuoteResponse>,
): BridgeQuoteResponse => deepMerge(BASE_QUOTE, overrides);

const getFirstTypedMessage = (
  messenger: jest.Mocked<SignatureControllerMessenger>,
) => {
  const callArgs = messenger.call.mock.calls[0];
  expect(callArgs).toBeDefined();
  return callArgs?.[1] as any;
};

describe('intent', () => {
  let messenger: jest.Mocked<SignatureControllerMessenger>;
  let submitIntent: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    submitIntent = jest.fn();
    (Engine.context.BridgeStatusController.submitIntent as jest.Mock) =
      submitIntent;
    messenger = makeSignatureMessenger();
    mockGetSignatureControllerMessenger.mockReturnValue(messenger);
  });
  describe('signIntent', () => {
    it('calls KeyringController:signTypedMessage with correct parameters', async () => {
      const signature = '0x1234567890abcdef' as Hex;
      messenger.call.mockResolvedValue(signature);
      const result = await signIntent({
        chainId: 1,
        from: ACCOUNT,
        order: BASE_ORDER,
        verifyingContract: VERIFYING_CONTRACT_DEFAULT,
        messenger,
      });
      expect(messenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        {
          from: ACCOUNT,
          data: {
            types: expect.any(Object),
            primaryType: 'Order',
            domain: {
              name: 'Gnosis Protocol',
              version: 'v2',
              chainId: 1,
              verifyingContract: VERIFYING_CONTRACT_DEFAULT,
            },
            message: expect.objectContaining({
              sellToken: BASE_ORDER.sellToken,
              buyToken: BASE_ORDER.buyToken,
              receiver: BASE_ORDER.receiver,
              sellAmount: BASE_ORDER.sellAmount,
              buyAmount: BASE_ORDER.buyAmount,
              validTo: BASE_ORDER.validTo,
              appData: expect.any(String),
              feeAmount: BASE_ORDER.feeAmount,
              kind: BASE_ORDER.kind,
              partiallyFillable: BASE_ORDER.partiallyFillable,
              sellTokenBalance: BASE_ORDER.sellTokenBalance,
              buyTokenBalance: BASE_ORDER.buyTokenBalance,
            }),
          },
        },
        SignTypedDataVersion.V4,
      );
      expect(result).toBe(signature);
    });
    it.each([
      [
        'normalizes non-bytes32 appData',
        '{"version":"1.0"}',
        /^0x[0-9a-fA-F]{64}$/,
      ],
      [
        'uses bytes32 appData directly',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        null,
      ],
    ])('%s', async (_label, appData, regex) => {
      messenger.call.mockResolvedValue('0x1234567890abcdef' as Hex);
      await signIntent({
        chainId: 1,
        from: ACCOUNT,
        order: { ...BASE_ORDER, appData: appData as any },
        verifyingContract: VERIFYING_CONTRACT_DEFAULT,
        messenger,
      });
      const { data } = getFirstTypedMessage(messenger);
      if (regex) expect(data.message.appData).toMatch(regex);
      else expect(data.message.appData).toBe(appData);
    });
  });
  describe('handleIntentTransaction', () => {
    it.each([
      ['undefined', undefined],
      ['empty', ''],
    ])('throws when selectedAccountAddress is %s', async (_l, acct) => {
      await expect(
        handleIntentTransaction(makeQuote(), acct as any),
      ).rejects.toThrow('Missing selected account for intent signing');
    });

    it('throws when quoteResponse has no intent', async () => {
      const quote = makeQuote({
        quote: deepMerge(BASE_QUOTE.quote as any, { intent: undefined } as any),
      } as any);

      await expect(handleIntentTransaction(quote, ACCOUNT)).rejects.toThrow(
        'Intent transaction is not supported',
      );
    });

    it('throws when intent.order is missing', async () => {
      const quote = makeQuote({
        quote: {
          ...(BASE_QUOTE.quote as any),
          intent: {
            ...(BASE_QUOTE.quote as any).intent,
            order: undefined,
            settlementContract: VERIFYING_CONTRACT_DEFAULT,
          },
        },
      } as any);

      await expect(handleIntentTransaction(quote, ACCOUNT)).rejects.toThrow(
        'Intent order is missing from quote response',
      );
    });

    it.each([
      [
        'undefined',
        makeQuote({
          quote: {
            ...(BASE_QUOTE.quote as any),
            intent: {
              ...(BASE_QUOTE.quote as any).intent,
              order: {
                ...(BASE_QUOTE.quote as any).intent.order,
                validTo: undefined,
              },
            },
          },
        } as any),
      ],
      [
        'invalid string',
        makeQuote({
          quote: {
            ...(BASE_QUOTE.quote as any),
            intent: {
              ...(BASE_QUOTE.quote as any).intent,
              order: {
                ...(BASE_QUOTE.quote as any).intent.order,
                validTo: 'not-a-number',
              },
            },
          },
        } as any),
      ],
    ])('throws when order.validTo is %s', async (_l, quote) => {
      await expect(handleIntentTransaction(quote, ACCOUNT)).rejects.toThrow(
        'Intent order validTo is missing or invalid in quote response',
      );
    });
    it('calls submitIntent with normalized quote response and signature', async () => {
      const signature = '0xabcdef1234567890' as Hex;
      const submitResult = { id: 'intent-tx-1', status: 'submitted' };
      messenger.call.mockResolvedValue(signature);
      submitIntent.mockResolvedValue(submitResult);
      const result = await handleIntentTransaction(makeQuote(), ACCOUNT);
      expect(mockGetSignatureControllerMessenger).toHaveBeenCalledWith(
        Engine.controllerMessenger,
      );
      expect(messenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        expect.any(Object),
        SignTypedDataVersion.V4,
      );
      expect(submitIntent).toHaveBeenCalledWith({
        quoteResponse: expect.objectContaining({
          quote: expect.objectContaining({
            intent: expect.objectContaining({
              order: expect.objectContaining({
                appDataHash: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
                receiver: ACCOUNT,
                sellAmount: '1000000000000000000',
                buyAmount: '2000000000',
                validTo: 1234567890,
                feeAmount: '0',
                sellTokenBalance: 'erc20',
                buyTokenBalance: 'erc20',
              }),
            }),
          }),
        }),
        signature,
        accountAddress: ACCOUNT,
      });
      expect(result).toBe(submitResult);
    });
    it('uses default settlementContract when not provided in intent', async () => {
      messenger.call.mockResolvedValue('0xabcdef1234567890' as Hex);
      submitIntent.mockResolvedValue({ id: 'intent-tx-1' });
      const quote = makeQuote({
        quote: {
          ...(BASE_QUOTE.quote as any),
          intent: {
            protocol: 'cowswap',
            order: { ...(BASE_QUOTE.quote as any).intent.order },
            settlementContract: undefined,
          },
        },
      } as any);
      await handleIntentTransaction(quote, ACCOUNT);
      const { data } = getFirstTypedMessage(messenger);
      expect(data.domain.verifyingContract).toBe(VERIFYING_CONTRACT_DEFAULT);
    });
    it('uses custom settlementContract when provided in intent', async () => {
      messenger.call.mockResolvedValue('0xabcdef1234567890' as Hex);
      submitIntent.mockResolvedValue({ id: 'intent-tx-1' });
      const quote = makeQuote({
        quote: {
          ...(BASE_QUOTE.quote as any),
          intent: {
            ...(BASE_QUOTE.quote as any).intent,
            settlementContract: CUSTOM_SETTLEMENT,
          },
        },
      } as any);
      await handleIntentTransaction(quote, ACCOUNT);
      const { data } = getFirstTypedMessage(messenger);
      expect(data.domain.verifyingContract).toBe(CUSTOM_SETTLEMENT);
    });

    it('normalizes order with default values when fields are missing', async () => {
      const signature = '0xabcdef1234567890' as Hex;
      messenger.call.mockResolvedValue(signature);
      submitIntent.mockResolvedValue({ id: 'intent-tx-1' });
      const quote = makeQuote({
        quote: {
          ...(BASE_QUOTE.quote as any),
          intent: {
            protocol: 'cowswap',
            settlementContract: VERIFYING_CONTRACT_DEFAULT,
            order: {
              sellToken: BASE_ORDER.sellToken,
              buyToken: BASE_ORDER.buyToken,
              validTo: String(BASE_ORDER.validTo),
              appData: '0x',

              // explicitly “missing” fields (otherwise base values leak in via deep merge)
              receiver: undefined,
              sellAmount: undefined,
              buyAmount: undefined,
              feeAmount: undefined,
              sellTokenBalance: undefined,
              buyTokenBalance: undefined,
            },
          },
        },
      } as any);
      await handleIntentTransaction(quote, ACCOUNT);
      expect(submitIntent).toHaveBeenCalledWith({
        quoteResponse: expect.objectContaining({
          quote: expect.objectContaining({
            intent: expect.objectContaining({
              order: expect.objectContaining({
                receiver: ACCOUNT,
                sellAmount: '0',
                buyAmount: '0',
                feeAmount: '0',
                sellTokenBalance: 'erc20',
                buyTokenBalance: 'erc20',
              }),
            }),
          }),
        }),
        signature,
        accountAddress: ACCOUNT,
      });
    });

    it('normalizes appData to appDataHash in the order', async () => {
      const signature = '0xabcdef1234567890' as Hex;
      messenger.call.mockResolvedValue(signature);
      submitIntent.mockResolvedValue({ id: 'intent-tx-1' });
      const quote = makeQuote({
        quote: {
          ...(BASE_QUOTE.quote as any),
          intent: {
            ...(BASE_QUOTE.quote as any).intent,
            order: {
              ...(BASE_QUOTE.quote as any).intent.order,
              appData: '{"version":"1.0"}',
            },
          },
        },
      } as any);
      await handleIntentTransaction(quote, ACCOUNT);
      expect(submitIntent).toHaveBeenCalledWith({
        quoteResponse: expect.objectContaining({
          quote: expect.objectContaining({
            intent: expect.objectContaining({
              order: expect.objectContaining({
                appDataHash: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
              }),
            }),
          }),
        }),
        signature,
        accountAddress: expect.any(String),
      });
    });
  });
});
