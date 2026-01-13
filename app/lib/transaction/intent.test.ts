import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { SignatureControllerMessenger } from '@metamask/signature-controller';
import { Hex } from '@metamask/utils';
import { handleIntentTransaction, signIntent } from './intent';
import { BridgeQuoteResponse } from '../../components/UI/Bridge/types';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  context: {
    BridgeStatusController: {
      submitIntent: jest.fn(),
    },
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

describe('intent', () => {
  let mockSignatureMessenger: jest.Mocked<SignatureControllerMessenger>;
  let mockSubmitIntent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubmitIntent = jest.fn();
    (Engine.context.BridgeStatusController.submitIntent as jest.Mock) =
      mockSubmitIntent;

    mockSignatureMessenger = {
      call: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      publish: jest.fn(),
      registerActionHandler: jest.fn(),
      unregisterActionHandler: jest.fn(),
      clearEventSubscriptions: jest.fn(),
      registerInitialEventPayload: jest.fn(),
    } as unknown as jest.Mocked<SignatureControllerMessenger>;

    mockGetSignatureControllerMessenger.mockReturnValue(mockSignatureMessenger);
  });

  describe('signIntent', () => {
    const mockOrder: Parameters<typeof signIntent>[0]['order'] = {
      sellToken: '0x0000000000000000000000000000000000000000' as Hex,
      buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
      receiver: '0x1234567890123456789012345678901234567890' as Hex,
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

    it('calls KeyringController:signTypedMessage with correct parameters', async () => {
      const mockSignature = '0x1234567890abcdef' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);

      const result = await signIntent({
        chainId: 1,
        from: '0x1234567890123456789012345678901234567890' as Hex,
        order: mockOrder,
        verifyingContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41' as Hex,
        messenger: mockSignatureMessenger,
      });

      expect(mockSignatureMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        {
          from: '0x1234567890123456789012345678901234567890',
          data: {
            types: expect.any(Object),
            primaryType: 'Order',
            domain: {
              name: 'Gnosis Protocol',
              version: 'v2',
              chainId: 1,
              verifyingContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41',
            },
            message: expect.objectContaining({
              sellToken: mockOrder.sellToken,
              buyToken: mockOrder.buyToken,
              receiver: mockOrder.receiver,
              sellAmount: mockOrder.sellAmount,
              buyAmount: mockOrder.buyAmount,
              validTo: mockOrder.validTo,
              appData: expect.any(String),
              feeAmount: mockOrder.feeAmount,
              kind: mockOrder.kind,
              partiallyFillable: mockOrder.partiallyFillable,
              sellTokenBalance: mockOrder.sellTokenBalance,
              buyTokenBalance: mockOrder.buyTokenBalance,
            }),
          },
        },
        SignTypedDataVersion.V4,
      );
      expect(result).toBe(mockSignature);
    });

    it('normalizes appData when it is not bytes32 hex', async () => {
      const mockSignature = '0x1234567890abcdef' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);

      const orderWithJsonAppData = {
        ...mockOrder,
        appData: '{"version":"1.0"}',
      };

      await signIntent({
        chainId: 1,
        from: '0x1234567890123456789012345678901234567890' as Hex,
        order: orderWithJsonAppData,
        verifyingContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41' as Hex,
        messenger: mockSignatureMessenger,
      });

      const callArgs = mockSignatureMessenger.call.mock.calls[0];
      expect(callArgs).toBeDefined();
      const messageData = (
        callArgs?.[1] as { data: { message: { appData: string } } }
      ).data.message;
      expect(messageData.appData).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });

    it('uses bytes32 hex appData directly when it is already bytes32 hex', async () => {
      const mockSignature = '0x1234567890abcdef' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);

      const bytes32Hex =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
      const orderWithBytes32AppData = {
        ...mockOrder,
        appData: bytes32Hex,
      };

      await signIntent({
        chainId: 1,
        from: '0x1234567890123456789012345678901234567890' as Hex,
        order: orderWithBytes32AppData,
        verifyingContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41' as Hex,
        messenger: mockSignatureMessenger,
      });

      const callArgs = mockSignatureMessenger.call.mock.calls[0];
      expect(callArgs).toBeDefined();
      const messageData = (
        callArgs?.[1] as { data: { message: { appData: string } } }
      ).data.message;
      expect(messageData.appData).toBe(bytes32Hex);
    });
  });

  describe('handleIntentTransaction', () => {
    const createMockQuoteResponse = (
      overrides?: Partial<BridgeQuoteResponse>,
    ): BridgeQuoteResponse => {
      const baseQuote = {
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
      };

      return {
        ...baseQuote,
        aggregator: 'test-aggregator',
        walletAddress: '0x1234567890123456789012345678901234567890',
        quote: {
          ...baseQuote,
          intent: {
            protocol: 'cowswap',
            order: {
              sellToken: '0x0000000000000000000000000000000000000000',
              buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              sellAmount: '1000000000000000000',
              buyAmount: '2000000000',
              validTo: '1234567890',
              appData: '0x',
              receiver: '0x1234567890123456789012345678901234567890',
            },
            settlementContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41',
          },
        },
        ...overrides,
      } as unknown as BridgeQuoteResponse;
    };

    it('throws error when selectedAccountAddress is undefined', async () => {
      const quoteResponse = createMockQuoteResponse();

      await expect(
        handleIntentTransaction(quoteResponse, undefined),
      ).rejects.toThrow('Missing selected account for intent signing');
    });

    it('throws error when selectedAccountAddress is empty string', async () => {
      const quoteResponse = createMockQuoteResponse();

      await expect(handleIntentTransaction(quoteResponse, '')).rejects.toThrow(
        'Missing selected account for intent signing',
      );
    });

    it('throws error when quoteResponse has no intent', async () => {
      const quoteResponse = createMockQuoteResponse({
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
        },
      } as unknown as BridgeQuoteResponse);

      await expect(
        handleIntentTransaction(
          quoteResponse,
          '0x1234567890123456789012345678901234567890',
        ),
      ).rejects.toThrow('Intent transaction is not supported');
    });

    it('calls submitIntent with normalized quote response and signature', async () => {
      const mockSignature = '0xabcdef1234567890' as Hex;
      const mockSubmitResult = {
        id: 'intent-tx-1',
        status: 'submitted',
      };
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);
      mockSubmitIntent.mockResolvedValue(mockSubmitResult);

      const quoteResponse = createMockQuoteResponse();
      const accountAddress = '0x1234567890123456789012345678901234567890';

      const result = await handleIntentTransaction(
        quoteResponse,
        accountAddress,
      );

      expect(mockGetSignatureControllerMessenger).toHaveBeenCalledWith(
        Engine.controllerMessenger,
      );
      expect(mockSignatureMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        expect.any(Object),
        SignTypedDataVersion.V4,
      );
      expect(mockSubmitIntent).toHaveBeenCalledWith({
        quoteResponse: expect.objectContaining({
          quote: expect.objectContaining({
            intent: expect.objectContaining({
              order: expect.objectContaining({
                appDataHash: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
                receiver: accountAddress,
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
        signature: mockSignature,
        accountAddress: accountAddress as Hex,
      });
      expect(result).toBe(mockSubmitResult);
    });

    it('uses default settlementContract when not provided in intent', async () => {
      const mockSignature = '0xabcdef1234567890' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);
      mockSubmitIntent.mockResolvedValue({ id: 'intent-tx-1' });

      const quoteResponse = createMockQuoteResponse({
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
              sellToken: '0x0000000000000000000000000000000000000000',
              buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              sellAmount: '1000000000000000000',
              buyAmount: '2000000000',
              validTo: '1234567890',
              appData: '0x',
              receiver: '0x1234567890123456789012345678901234567890',
            },
          },
        },
      } as unknown as BridgeQuoteResponse);

      await handleIntentTransaction(
        quoteResponse,
        '0x1234567890123456789012345678901234567890',
      );

      const callArgs = mockSignatureMessenger.call.mock.calls[0];
      expect(callArgs).toBeDefined();
      const domain = (
        callArgs?.[1] as { data: { domain: { verifyingContract: string } } }
      ).data.domain;
      expect(domain.verifyingContract).toBe(
        '0x9008D19f58AAbd9eD0D60971565AA8510560ab41',
      );
    });

    it('uses custom settlementContract when provided in intent', async () => {
      const mockSignature = '0xabcdef1234567890' as Hex;
      const customSettlementContract =
        '0x1111111111111111111111111111111111111111' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);
      mockSubmitIntent.mockResolvedValue({ id: 'intent-tx-1' });

      const quoteResponse = createMockQuoteResponse({
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
              sellToken: '0x0000000000000000000000000000000000000000',
              buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              sellAmount: '1000000000000000000',
              buyAmount: '2000000000',
              validTo: '1234567890',
              appData: '0x',
              receiver: '0x1234567890123456789012345678901234567890',
            },
            settlementContract: customSettlementContract,
          },
        },
      } as unknown as BridgeQuoteResponse);

      await handleIntentTransaction(
        quoteResponse,
        '0x1234567890123456789012345678901234567890',
      );

      const callArgs = mockSignatureMessenger.call.mock.calls[0];
      expect(callArgs).toBeDefined();
      const domain = (
        callArgs?.[1] as { data: { domain: { verifyingContract: string } } }
      ).data.domain;
      expect(domain.verifyingContract).toBe(customSettlementContract);
    });

    it('normalizes order with default values when fields are missing', async () => {
      const mockSignature = '0xabcdef1234567890' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);
      mockSubmitIntent.mockResolvedValue({ id: 'intent-tx-1' });

      const quoteResponse = createMockQuoteResponse({
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
              sellToken: '0x0000000000000000000000000000000000000000',
              buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              validTo: '1234567890',
              appData: '0x',
            },
            settlementContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41',
          },
        },
      } as unknown as BridgeQuoteResponse);

      const accountAddress = '0x1234567890123456789012345678901234567890';

      await handleIntentTransaction(quoteResponse, accountAddress);

      expect(mockSubmitIntent).toHaveBeenCalledWith({
        quoteResponse: expect.objectContaining({
          quote: expect.objectContaining({
            intent: expect.objectContaining({
              order: expect.objectContaining({
                receiver: accountAddress,
                sellAmount: '0',
                buyAmount: '0',
                feeAmount: '0',
                sellTokenBalance: 'erc20',
                buyTokenBalance: 'erc20',
              }),
            }),
          }),
        }),
        signature: mockSignature,
        accountAddress: accountAddress as Hex,
      });
    });

    it('normalizes appData to appDataHash in the order', async () => {
      const mockSignature = '0xabcdef1234567890' as Hex;
      mockSignatureMessenger.call.mockResolvedValue(mockSignature);
      mockSubmitIntent.mockResolvedValue({ id: 'intent-tx-1' });

      const quoteResponse = createMockQuoteResponse({
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
              sellToken: '0x0000000000000000000000000000000000000000',
              buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              sellAmount: '1000000000000000000',
              buyAmount: '2000000000',
              validTo: '1234567890',
              appData: '{"version":"1.0"}',
              receiver: '0x1234567890123456789012345678901234567890',
            },
            settlementContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41',
          },
        },
      } as unknown as BridgeQuoteResponse);

      await handleIntentTransaction(
        quoteResponse,
        '0x1234567890123456789012345678901234567890',
      );

      expect(mockSubmitIntent).toHaveBeenCalledWith({
        quoteResponse: expect.objectContaining({
          quote: expect.objectContaining({
            intent: expect.objectContaining({
              order: expect.objectContaining({
                appDataHash: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
              }),
            }),
          }),
        }),
        signature: mockSignature,
        accountAddress: expect.any(String),
      });
    });
  });
});
