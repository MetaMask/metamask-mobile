import {
  TransactionPayStrategy,
  TransactionPayQuote,
  TransactionPayTotals,
  TransactionPayRequiredToken,
  TransactionPaySourceAmount,
} from '@metamask/transaction-pay-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
} from './useTransactionPayData';
import { cloneDeep, merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { Hex, Json } from '@metamask/utils';
import {
  ConfirmationContextParams,
  useConfirmationContext,
} from '../../context/confirmation-context';

jest.mock('../../context/confirmation-context');

const QUOTE_MOCK = {
  strategy: TransactionPayStrategy.Test,
} as TransactionPayQuote<Json>;

const REQUIRED_TOKEN_MOCK = {
  address: '0x123' as Hex,
} as TransactionPayRequiredToken;

const SOURCE_AMOUNT_MOCK = {} as TransactionPaySourceAmount;

const TOTALS_MOCK = {
  total: { usd: '1000', fiat: '1234' },
} as TransactionPayTotals;

const state = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  {
    engine: {
      backgroundState: {
        TransactionPayController: {
          transactionData: {
            [transactionIdMock]: {
              isLoading: true,
              isMaxAmount: true,
              isPostQuote: true,
              quotes: [QUOTE_MOCK],
              sourceAmounts: [SOURCE_AMOUNT_MOCK],
              tokens: [REQUIRED_TOKEN_MOCK],
              totals: TOTALS_MOCK,
            },
          },
        },
      },
    },
  },
);

describe('useTransactionPayData', () => {
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);

  beforeEach(() => {
    jest.resetAllMocks();

    useConfirmationContextMock.mockReturnValue({
      isTransactionDataUpdating: false,
    } as ConfirmationContextParams);
  });

  it('returns quotes', () => {
    expect(
      renderHookWithProvider(useTransactionPayQuotes, { state }).result.current,
    ).toStrictEqual([QUOTE_MOCK]);
  });

  it('returns required tokens', () => {
    expect(
      renderHookWithProvider(useTransactionPayRequiredTokens, { state }).result
        .current,
    ).toStrictEqual([REQUIRED_TOKEN_MOCK]);
  });

  it('returns source amounts', () => {
    expect(
      renderHookWithProvider(useTransactionPaySourceAmounts, { state }).result
        .current,
    ).toStrictEqual([SOURCE_AMOUNT_MOCK]);
  });

  it('returns loading state', () => {
    expect(
      renderHookWithProvider(useIsTransactionPayLoading, { state }).result
        .current,
    ).toBe(true);
  });

  it('returns quote loading state from controller only', () => {
    expect(
      renderHookWithProvider(useIsTransactionPayQuoteLoading, { state }).result
        .current,
    ).toBe(true);
  });

  it('returns false for quote loading when controller is not loading', () => {
    useConfirmationContextMock.mockReturnValue({
      isTransactionDataUpdating: true,
    } as ConfirmationContextParams);

    const updatedState = cloneDeep(state);
    updatedState.engine.backgroundState.TransactionPayController.transactionData[
      transactionIdMock
    ].isLoading = false;

    expect(
      renderHookWithProvider(useIsTransactionPayQuoteLoading, {
        state: updatedState,
      }).result.current,
    ).toBe(false);
  });

  it('returns loading if data updating', () => {
    useConfirmationContextMock.mockReturnValue({
      isTransactionDataUpdating: true,
    } as ConfirmationContextParams);

    const updatedState = cloneDeep(state);
    updatedState.engine.backgroundState.TransactionPayController.transactionData[
      transactionIdMock
    ].isLoading = false;

    expect(
      renderHookWithProvider(useIsTransactionPayLoading, {
        state: updatedState,
      }).result.current,
    ).toBe(true);
  });

  it('returns totals', () => {
    expect(
      renderHookWithProvider(useTransactionPayTotals, { state }).result.current,
    ).toStrictEqual(TOTALS_MOCK);
  });

  it('returns isMaxAmount', () => {
    expect(
      renderHookWithProvider(useTransactionPayIsMaxAmount, { state }).result
        .current,
    ).toBe(true);
  });

  it('returns isPostQuote as true when set', () => {
    expect(
      renderHookWithProvider(useTransactionPayIsPostQuote, { state }).result
        .current,
    ).toBe(true);
  });

  it('returns isPostQuote as false when not set', () => {
    const updatedState = cloneDeep(state);
    updatedState.engine.backgroundState.TransactionPayController.transactionData[
      transactionIdMock
    ].isPostQuote = false;

    expect(
      renderHookWithProvider(useTransactionPayIsPostQuote, {
        state: updatedState,
      }).result.current,
    ).toBe(false);
  });

  it('returns false for isPostQuote when no transaction data', () => {
    const stateWithoutTransactionData = merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      {
        engine: {
          backgroundState: {
            TransactionPayController: {
              transactionData: {},
            },
          },
        },
      },
    );

    expect(
      renderHookWithProvider(useTransactionPayIsPostQuote, {
        state: stateWithoutTransactionData,
      }).result.current,
    ).toBe(false);
  });
});
