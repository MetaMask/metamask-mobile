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

const BASE_TYPED_DATA = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Order: [
      { name: 'sellToken', type: 'address' },
      { name: 'buyToken', type: 'address' },
      { name: 'receiver', type: 'address' },
      { name: 'sellAmount', type: 'uint256' },
      { name: 'buyAmount', type: 'uint256' },
      { name: 'validTo', type: 'uint32' },
      { name: 'appData', type: 'bytes32' },
      { name: 'feeAmount', type: 'uint256' },
      { name: 'kind', type: 'string' },
      { name: 'partiallyFillable', type: 'bool' },
      { name: 'sellTokenBalance', type: 'string' },
      { name: 'buyTokenBalance', type: 'string' },
    ],
  },
  primaryType: 'Order',
  domain: {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId: 1,
    verifyingContract: VERIFYING_CONTRACT_DEFAULT,
  },
  message: {
    sellToken: '0x0000000000000000000000000000000000000000' as Hex,
    buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
    receiver: ACCOUNT,
    sellAmount: '1000000000000000000',
    buyAmount: '2000000000',
    validTo: 1234567890,
    appData:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
    feeAmount: '0',
    kind: 'sell',
    partiallyFillable: false,
    sellTokenBalance: 'erc20',
    buyTokenBalance: 'erc20',
  },
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
        sellToken: BASE_TYPED_DATA.message.sellToken,
        buyToken: BASE_TYPED_DATA.message.buyToken,
        sellAmount: BASE_TYPED_DATA.message.sellAmount,
        buyAmount: BASE_TYPED_DATA.message.buyAmount,
        validTo: String(BASE_TYPED_DATA.message.validTo),
        appData: BASE_TYPED_DATA.message.appData,
        receiver: ACCOUNT,
      },
      settlementContract: VERIFYING_CONTRACT_DEFAULT,
      typedData: BASE_TYPED_DATA,
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
        from: ACCOUNT,
        typedData: BASE_TYPED_DATA as any,
        messenger,
      });
      expect(messenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        {
          from: ACCOUNT,
          data: BASE_TYPED_DATA,
        },
        SignTypedDataVersion.V4,
      );
      expect(result).toBe(signature);
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

    it('throws when intent.typedData is missing', async () => {
      const quote = makeQuote({
        quote: {
          ...(BASE_QUOTE.quote as any),
          intent: {
            ...(BASE_QUOTE.quote as any).intent,
            typedData: undefined,
          },
        },
      } as any);

      await expect(handleIntentTransaction(quote, ACCOUNT)).rejects.toThrow(
        'Intent typed data is missing from quote response',
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
        quoteResponse: makeQuote(),
        signature,
        accountAddress: ACCOUNT,
      });
      expect(result).toBe(submitResult);
    });
  });
});
