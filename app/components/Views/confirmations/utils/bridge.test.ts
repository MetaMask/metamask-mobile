import {
  BridgeControllerEvents,
  BridgeControllerState,
  QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../../core/Engine';
import { ExtendedControllerMessenger } from '../../../../core/ExtendedControllerMessenger';
import { BridgeQuoteRequest, getBridgeQuotes } from './bridge';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';

jest.mock('../../../../core/Engine');
jest.mock('../../../../core/redux/slices/bridge');

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
  const engineMock = jest.mocked(Engine);
  let messengerMock: ExtendedControllerMessenger<never, BridgeControllerEvents>;

  beforeEach(() => {
    jest.resetAllMocks();

    messengerMock = new ExtendedControllerMessenger();

    engineMock.controllerMessenger = messengerMock as never;

    engineMock.context = {
      BridgeController: {
        resetState: jest.fn(),
        updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue({}),
      },
    } as never;

    selectBridgeQuotesMock.mockImplementation(
      (state) =>
        ({
          recommendedQuote:
            state.engine.backgroundState.BridgeController.quotes[0],
        } as never),
    );
  });

  describe('getBridgeQuotes', () => {
    it('returns quotes', async () => {
      jest
        .mocked(
          engineMock.context.BridgeController.updateBridgeQuoteRequestParams,
        )
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

      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      const quotes = await quotesPromise;

      expect(quotes).toStrictEqual([QUOTE_1_MOCK, QUOTE_2_MOCK]);
    });

    it('returns empty array if quotes not found after timeout', async () => {
      const quotesPromise = getBridgeQuotes([
        QUOTE_REQUEST_1_MOCK,
        QUOTE_REQUEST_2_MOCK,
      ]);

      await jest.runAllTimersAsync();

      const quotes = await quotesPromise;

      expect(quotes).toStrictEqual([]);
    });

    it('returns empty array if quotes do not match request', async () => {
      jest
        .mocked(
          engineMock.context.BridgeController.updateBridgeQuoteRequestParams,
        )
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
  });
});
