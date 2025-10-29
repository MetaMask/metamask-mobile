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
  refreshQuote,
} from './bridge';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { cloneDeep } from 'lodash';

jest.mock('../../../../core/Engine');
jest.mock('../../../../core/redux/slices/bridge');
jest.mock('../../../../selectors/smartTransactionsController');

jest.useFakeTimers();

const QUOTE_REQUEST_1_MOCK: BridgeQuoteRequest = {
  attemptsMax: 1,
  bufferInitial: 1,
  bufferStep: 1,
  bufferSubsequent: 2,
  featureId: FeatureId.PERPS,
  from: '0x123',
  slippage: 0.005,
  sourceBalanceRaw: '10000000000000000000',
  sourceChainId: '0x1',
  sourceTokenAddress: '0xabc',
  sourceTokenAmount: '1000000000000000000',
  targetAmountMinimum: '123',
  targetChainId: '0x2',
  targetTokenAddress: '0xdef',
};

const QUOTE_REQUEST_2_MOCK: BridgeQuoteRequest = {
  ...QUOTE_REQUEST_1_MOCK,
  featureId: undefined,
  targetTokenAddress: '0x456',
};

const QUOTE_1_MOCK = {
  quote: {
    minDestTokenAmount: '124',
    destAsset: {
      address: QUOTE_REQUEST_1_MOCK.targetTokenAddress,
    },
  },
} as unknown as QuoteResponse;

const QUOTE_2_MOCK = {
  quote: {
    minDestTokenAmount: '124',
    destAsset: {
      address: QUOTE_REQUEST_2_MOCK.targetTokenAddress,
    },
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

      expect(quotes).toStrictEqual([
        expect.objectContaining(QUOTE_1_MOCK),
        expect.objectContaining(QUOTE_2_MOCK),
      ]);
    });

    it('returns metrics', async () => {
      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      const quotes = await quotesPromise;

      expect(quotes).toStrictEqual([
        expect.objectContaining({
          metrics: { attempts: 1, buffer: 1, latency: 0 },
        }),
        expect.objectContaining({
          metrics: { attempts: 1, buffer: 2, latency: 0 },
        }),
      ]);
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
        undefined,
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
        undefined,
        undefined,
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
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 10,
          cost: { valueInCurrency: '1.5' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 20,
          cost: { valueInCurrency: '1' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 30,
          cost: { valueInCurrency: '2' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 50,
          cost: { valueInCurrency: '0.9' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue(QUOTES);

      const quotes = await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(quotes).toStrictEqual([expect.objectContaining(QUOTES[2])]);
    });

    it('ignores quote if token amount if less than minimum', async () => {
      const QUOTES = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 10,
          cost: { valueInCurrency: '1.5' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 20,
          cost: { valueInCurrency: '1' },
          quote: {
            minDestTokenAmount: '122',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 30,
          cost: { valueInCurrency: '2' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 50,
          cost: { valueInCurrency: '0.9' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue(QUOTES);

      const quotes = await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(quotes).toStrictEqual([expect.objectContaining(QUOTES[1])]);
    });

    it('returns undefined if all fastest quotes have token amount less than minimum', async () => {
      const QUOTES = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 10,
          cost: { valueInCurrency: '1.5' },
          quote: {
            minDestTokenAmount: '122',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 20,
          cost: { valueInCurrency: '1' },
          quote: {
            minDestTokenAmount: '122',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 30,
          cost: { valueInCurrency: '2' },
          quote: {
            minDestTokenAmount: '122',
          },
        },
        {
          estimatedProcessingTimeInSeconds: 50,
          cost: { valueInCurrency: '0.9' },
          quote: {
            minDestTokenAmount: '124',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue(QUOTES);

      const quotes = await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(quotes).toBeUndefined();
    });

    it('increases source amount until target amount minimum reached', async () => {
      const QUOTES_ATTEMPT_1 = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '122',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_2 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '124',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes
        .mockResolvedValueOnce(QUOTES_ATTEMPT_1)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_2);

      const quotes = await getBridgeQuotes([
        { ...QUOTE_REQUEST_1_MOCK, attemptsMax: 2 },
      ]);

      expect(quotes).toStrictEqual([
        expect.objectContaining(QUOTES_ATTEMPT_2[0]),
      ]);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(2);
      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '1000000000000000000',
        }),
        undefined,
        expect.any(String),
      );
      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '1500000000000000000',
        }),
        undefined,
        expect.any(String),
      );
    });

    it('returns undefined if target amount minimum not reached after max attempts', async () => {
      const QUOTES_ATTEMPT_1 = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '120',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_2 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '121',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_3 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '122',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes
        .mockResolvedValueOnce(QUOTES_ATTEMPT_1)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_2)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_3);

      const quotes = await getBridgeQuotes([
        { ...QUOTE_REQUEST_1_MOCK, attemptsMax: 3 },
      ]);

      expect(quotes).toBeUndefined();

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(3);
    });

    it('returns undefined if target amount minimum not reached and at balance limit', async () => {
      const QUOTES_ATTEMPT_1 = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '120',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_2 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '121',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes
        .mockResolvedValueOnce(QUOTES_ATTEMPT_1)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_2);

      const quotes = await getBridgeQuotes([
        {
          ...QUOTE_REQUEST_1_MOCK,
          attemptsMax: 3,
          sourceBalanceRaw: '1500000000000000000',
        },
      ]);

      expect(quotes).toBeUndefined();

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(2);
    });

    it('uses balance as source token amount if next amount greater than balance', async () => {
      const QUOTES_ATTEMPT_1 = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '120',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_2 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '123',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes
        .mockResolvedValueOnce(QUOTES_ATTEMPT_1)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_2);

      const quotes = await getBridgeQuotes([
        {
          ...QUOTE_REQUEST_1_MOCK,
          attemptsMax: 3,
          sourceBalanceRaw: '1400000000000000000',
        },
      ]);

      expect(quotes).toStrictEqual([
        expect.objectContaining(QUOTES_ATTEMPT_2[0]),
      ]);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(2);
      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '1000000000000000000',
        }),
        undefined,
        expect.any(String),
      );
      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '1400000000000000000',
        }),
        undefined,
        expect.any(String),
      );
    });

    it('does not increase source amount if not first request', async () => {
      const QUOTES_ATTEMPT_1 = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '123',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_2 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '122',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes
        .mockResolvedValueOnce(QUOTES_ATTEMPT_1)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_2);

      const quotes = await getBridgeQuotes([
        {
          ...QUOTE_REQUEST_1_MOCK,
          attemptsMax: 3,
        },
        {
          ...QUOTE_REQUEST_2_MOCK,
          attemptsMax: 3,
        },
      ]);

      expect(quotes).toBeUndefined();

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(2);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          srcTokenAmount: '1000000000000000000',
        }),
        undefined,
        expect.any(String),
      );

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          srcTokenAmount: '1000000000000000000',
        }),
        undefined,
        undefined,
      );
    });

    it('limits increased source amount to balance minus source amount of subsequent requests', async () => {
      const QUOTES_ATTEMPT_1 = [
        {
          estimatedProcessingTimeInSeconds: 40,
          cost: { valueInCurrency: '0.5' },
          quote: {
            minDestTokenAmount: '122',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_2 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '123',
          },
        },
      ] as TransactionBridgeQuote[];

      const QUOTES_ATTEMPT_3 = [
        {
          ...QUOTES_ATTEMPT_1[0],
          quote: {
            minDestTokenAmount: '123',
          },
        },
      ] as TransactionBridgeQuote[];

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes
        .mockResolvedValueOnce(QUOTES_ATTEMPT_1)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_2)
        .mockResolvedValueOnce(QUOTES_ATTEMPT_3);

      const quotes = await getBridgeQuotes([
        {
          ...QUOTE_REQUEST_1_MOCK,
          attemptsMax: 3,
          sourceBalanceRaw: '2400000000000000000',
        },
        {
          ...QUOTE_REQUEST_2_MOCK,
          attemptsMax: 3,
        },
      ]);

      expect(quotes).toStrictEqual([
        expect.objectContaining(QUOTES_ATTEMPT_2[0]),
        expect.objectContaining(QUOTES_ATTEMPT_3[0]),
      ]);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(3);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          srcTokenAmount: '1000000000000000000',
          destTokenAddress: QUOTE_REQUEST_1_MOCK.targetTokenAddress,
        }),
        undefined,
        expect.any(String),
      );

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          srcTokenAmount: '1000000000000000000',
          destTokenAddress: QUOTE_REQUEST_2_MOCK.targetTokenAddress,
        }),
        undefined,
        undefined,
      );

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          srcTokenAmount: '1400000000000000000',
          destTokenAddress: QUOTE_REQUEST_1_MOCK.targetTokenAddress,
        }),
        undefined,
        expect.any(String),
      );
    });

    it('requests quotes with gasIncluded false when smart transactions disabled', async () => {
      await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded: false,
        }),
        undefined,
        expect.any(String),
      );
    });

    it('requests quotes with gasIncluded true when smart transactions enabled', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(true);

      await getBridgeQuotes([QUOTE_REQUEST_1_MOCK]);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded: true,
        }),
        undefined,
        expect.any(String),
      );
    });
  });

  describe('refreshQuote', () => {
    it('returns new quote', async () => {
      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue([QUOTE_2_MOCK]);

      const result = await refreshQuote({
        ...QUOTE_1_MOCK,
        request: QUOTE_REQUEST_1_MOCK,
      } as TransactionBridgeQuote);

      expect(result).toStrictEqual(expect.objectContaining(QUOTE_2_MOCK));
    });

    it('requests new quote', async () => {
      await refreshQuote({
        ...QUOTE_1_MOCK,
        request: QUOTE_REQUEST_1_MOCK,
      } as TransactionBridgeQuote);

      expect(bridgeControllerMock.fetchQuotes).toHaveBeenCalledTimes(1);
    });

    it('throws if new quote under minimum', async () => {
      const quote = cloneDeep(QUOTE_1_MOCK);
      quote.quote.minDestTokenAmount = '122';

      bridgeControllerMock.fetchQuotes.mockReset();
      bridgeControllerMock.fetchQuotes.mockResolvedValue([quote]);

      await expect(
        refreshQuote({
          ...QUOTE_1_MOCK,
          request: QUOTE_REQUEST_1_MOCK,
        } as TransactionBridgeQuote),
      ).rejects.toThrow('All quotes under minimum');
    });
  });
});
