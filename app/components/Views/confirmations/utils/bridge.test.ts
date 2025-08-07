import {
  BridgeController,
  BridgeControllerEvents,
  BridgeControllerState,
  QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../../core/Engine';
import { ExtendedControllerMessenger } from '../../../../core/ExtendedControllerMessenger';
import { BridgeQuoteRequest, getBridgeQuotes } from './bridge';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';

jest.mock('../../../../core/Engine');
jest.mock('../../../../core/redux/slices/bridge');
jest.mock('../../../../selectors/smartTransactionsController');

jest.useFakeTimers();

const QUOTE_REQUEST_1_MOCK: BridgeQuoteRequest = {
  from: '0x123',
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
} as unknown as QuoteResponse;

const QUOTE_2_MOCK = {
  quote: {
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

  beforeEach(() => {
    jest.resetAllMocks();

    messengerMock = new ExtendedControllerMessenger();

    bridgeControllerMock = {
      resetState: jest.fn(),
      updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<BridgeController>;

    engineMock.controllerMessenger = messengerMock as never;
    engineMock.context.BridgeController = bridgeControllerMock as never;

    selectBridgeQuotesMock.mockImplementation(
      (state) =>
        ({
          recommendedQuote:
            state.engine.backgroundState.BridgeController.quotes[0],
        } as never),
    );

    bridgeControllerMock.updateBridgeQuoteRequestParams
      .mockImplementationOnce(() => {
        messengerMock.publish(
          'BridgeController:stateChange',
          {
            quotes: [QUOTE_1_MOCK],
          } as BridgeControllerState,
          [],
        );

        return Promise.resolve();
      })
      .mockImplementationOnce(() => {
        messengerMock.publish(
          'BridgeController:stateChange',
          {
            quotes: [QUOTE_2_MOCK],
          } as BridgeControllerState,
          [],
        );

        return Promise.resolve();
      });

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

    it('returns empty array if quotes not found after timeout', async () => {
      bridgeControllerMock.updateBridgeQuoteRequestParams.mockReset();

      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      await jest.runAllTimersAsync();

      const quotes = await quotesPromise;

      expect(quotes).toStrictEqual([]);
    });

    it('returns empty array if quotes do not match request', async () => {
      bridgeControllerMock.updateBridgeQuoteRequestParams.mockReset();
      bridgeControllerMock.updateBridgeQuoteRequestParams
        .mockImplementationOnce(() => {
          messengerMock.publish(
            'BridgeController:stateChange',
            {
              quotes: [QUOTE_2_MOCK],
            } as BridgeControllerState,
            [],
          );

          return Promise.resolve();
        })
        .mockImplementationOnce(() => {
          messengerMock.publish(
            'BridgeController:stateChange',
            {
              quotes: [QUOTE_1_MOCK],
            } as BridgeControllerState,
            [],
          );

          return Promise.resolve();
        });

      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      await jest.runAllTimersAsync();

      const quotes = await quotesPromise;

      expect(quotes).toStrictEqual([]);
    });

    it('updates bridge request parameters', async () => {
      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      await quotesPromise;

      expect(
        bridgeControllerMock.updateBridgeQuoteRequestParams,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: QUOTE_REQUEST_1_MOCK.from,
          srcChainId: QUOTE_REQUEST_1_MOCK.sourceChainId,
          srcTokenAddress: QUOTE_REQUEST_1_MOCK.sourceTokenAddress,
          srcTokenAmount: QUOTE_REQUEST_1_MOCK.sourceTokenAmount,
          destChainId: QUOTE_REQUEST_1_MOCK.targetChainId,
          destTokenAddress: QUOTE_REQUEST_1_MOCK.targetTokenAddress,
        }),
        expect.any(Object),
      );

      expect(
        bridgeControllerMock.updateBridgeQuoteRequestParams,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: QUOTE_REQUEST_2_MOCK.from,
          srcChainId: QUOTE_REQUEST_2_MOCK.sourceChainId,
          srcTokenAddress: QUOTE_REQUEST_2_MOCK.sourceTokenAddress,
          srcTokenAmount: QUOTE_REQUEST_2_MOCK.sourceTokenAmount,
          destChainId: QUOTE_REQUEST_2_MOCK.targetChainId,
          destTokenAddress: QUOTE_REQUEST_2_MOCK.targetTokenAddress,
        }),
        expect.any(Object),
      );
    });
  });

  it('sets smart transactions enabled in request parameters', async () => {
    selectShouldUseSmartTransactionMock.mockReset();
    selectShouldUseSmartTransactionMock
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await getBridgeQuotes([QUOTE_REQUEST_1_MOCK, QUOTE_REQUEST_2_MOCK]);

    expect(
      bridgeControllerMock.updateBridgeQuoteRequestParams,
    ).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        stx_enabled: true,
      }),
    );

    expect(
      bridgeControllerMock.updateBridgeQuoteRequestParams,
    ).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        stx_enabled: false,
      }),
    );
  });
});
