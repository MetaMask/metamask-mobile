import {
  BridgeController,
  BridgeControllerEvents,
  FeatureId,
  QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../../core/Engine';
import { ExtendedControllerMessenger } from '../../../../core/ExtendedControllerMessenger';
import {
  BridgeQuoteRequest,
  TransactionBridgeQuote,
  getBridgeQuotes,
} from './bridge';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import { GasFeeController } from '@metamask/gas-fee-controller';

jest.mock('../../../../core/Engine');
jest.mock('../../../../core/redux/slices/bridge');
jest.mock('../../../../selectors/smartTransactionsController');

jest.useFakeTimers();

const QUOTE_REQUEST_1_MOCK: BridgeQuoteRequest = {
  from: '0x123',
  minimumTargetAmount: '1.23',
  sourceChainId: '0x1',
  sourceTokenAddress: '0xabc',
  sourceTokenAmount: '1000000000000000000',
  targetChainId: '0x2',
  targetTokenAddress: '0xdef',
};

const QUOTE_REQUEST_2_MOCK: BridgeQuoteRequest = {
  ...QUOTE_REQUEST_1_MOCK,
  targetTokenAddress: '0x456',
};

const QUOTE_1_MOCK = {
  quote: {
    destAsset: {
      address: QUOTE_REQUEST_1_MOCK.targetTokenAddress,
    },
  },
  toTokenAmount: {
    amount: '1.24',
  },
} as unknown as QuoteResponse;

const QUOTE_2_MOCK = {
  quote: {
    destAsset: {
      address: QUOTE_REQUEST_2_MOCK.targetTokenAddress,
    },
  },
  toTokenAmount: {
    amount: '1.24',
  },
} as unknown as QuoteResponse;

describe('Confirmations Bridge Utils', () => {
  const selectBridgeQuotesMock = jest.mocked(selectBridgeQuotes);
  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );
  const engineMock = jest.mocked(Engine);
  let messengerMock: ExtendedControllerMessenger<never, BridgeControllerEvents>;
  let bridgeControllerMock: jest.Mocked<BridgeController>;
  let gasFeeControllerMock: jest.Mocked<GasFeeController>;

  beforeEach(() => {
    jest.resetAllMocks();

    messengerMock = new ExtendedControllerMessenger();

    bridgeControllerMock = {
      fetchQuotes: jest.fn(),
    } as unknown as jest.Mocked<BridgeController>;

    gasFeeControllerMock = {
      fetchGasFeeEstimates: jest.fn(),
    } as unknown as jest.Mocked<GasFeeController>;

    engineMock.controllerMessenger = messengerMock as never;
    engineMock.context.BridgeController = bridgeControllerMock as never;
    engineMock.context.GasFeeController = gasFeeControllerMock as never;

    selectBridgeQuotesMock.mockImplementation(
      (state) =>
        ({
          sortedQuotes: state.engine.backgroundState.BridgeController.quotes,
        } as never),
    );

    bridgeControllerMock.fetchQuotes
      .mockResolvedValueOnce([QUOTE_1_MOCK])
      .mockResolvedValueOnce([QUOTE_2_MOCK]);

    gasFeeControllerMock.fetchGasFeeEstimates.mockResolvedValue({
      gasFeeEstimates: {
        low: {
          gasLimit: '21000',
          gasPrice: '1000000000',
        },
        medium: {
          gasLimit: '21000',
          gasPrice: '2000000000',
        },
        high: {
          gasLimit: '21000',
          gasPrice: '3000000000',
        },
      },
    } as never);

    selectShouldUseSmartTransactionMock.mockReturnValue(false);
  });

  describe('getBridgeQuotes', () => {
    it('returns quotes', async () => {
      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      const quotes = await quotesPromise;

      expect(quotes).toStrictEqual([QUOTE_1_MOCK, QUOTE_2_MOCK]);
    });

    it('requests quotes', async () => {
      await getBridgeQuotes([QUOTE_REQUEST_1_MOCK, QUOTE_REQUEST_2_MOCK]);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: QUOTE_REQUEST_1_MOCK.from,
          srcChainId: QUOTE_REQUEST_1_MOCK.sourceChainId,
          srcTokenAddress: QUOTE_REQUEST_1_MOCK.sourceTokenAddress,
          srcTokenAmount: QUOTE_REQUEST_1_MOCK.sourceTokenAmount,
          destChainId: QUOTE_REQUEST_1_MOCK.targetChainId,
          destTokenAddress: QUOTE_REQUEST_1_MOCK.targetTokenAddress,
          slippage: 0.5,
          insufficientBal: false,
        }),
        expect.any(Object),
        FeatureId.PERPS,
      );

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: QUOTE_REQUEST_2_MOCK.from,
          srcChainId: QUOTE_REQUEST_2_MOCK.sourceChainId,
          srcTokenAddress: QUOTE_REQUEST_2_MOCK.sourceTokenAddress,
          srcTokenAmount: QUOTE_REQUEST_2_MOCK.sourceTokenAmount,
          destChainId: QUOTE_REQUEST_2_MOCK.targetChainId,
          destTokenAddress: QUOTE_REQUEST_2_MOCK.targetTokenAddress,
          slippage: 0.5,
          insufficientBal: false,
        }),
        expect.any(Object),
        FeatureId.PERPS,
      );
    });

    it('returns undefined if no quotes', async () => {
      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue([]);

      const quotes = await getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      expect(quotes).toBeUndefined();
    });

    it('selects cheapest quote of 3 fastest quotes', async () => {
      const QUOTES = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 10,
          cost: { valueInCurrency: '1.5' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 20,
          cost: { valueInCurrency: '1' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 30,
          cost: { valueInCurrency: '2' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 50,
          cost: { valueInCurrency: '0.9' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue(QUOTES);

      const quotes = await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(quotes).toStrictEqual([QUOTES[2]]);
    });

    it('ignores quote if token amount if less than minimum', async () => {
      const QUOTES = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 10,
          cost: { valueInCurrency: '1.5' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 20,
          cost: { valueInCurrency: '1' },
          toTokenAmount: {
            amount: '1.22',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 30,
          cost: { valueInCurrency: '2' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 50,
          cost: { valueInCurrency: '0.9' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue(QUOTES);

      const quotes = await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(quotes).toStrictEqual([QUOTES[1]]);
    });

    it('returns undefined if all fastest quotes have token amount less than minimum', async () => {
      const QUOTES = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 10,
          cost: { valueInCurrency: '1.5' },
          toTokenAmount: {
            amount: '1.22',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 20,
          cost: { valueInCurrency: '1' },
          toTokenAmount: {
            amount: '1.22',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 30,
          cost: { valueInCurrency: '2' },
          toTokenAmount: {
            amount: '1.22',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 50,
          cost: { valueInCurrency: '0.9' },
          toTokenAmount: {
            amount: '1.24',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue(QUOTES);

      const quotes = await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(quotes).toBeUndefined();
    });
  });
});
