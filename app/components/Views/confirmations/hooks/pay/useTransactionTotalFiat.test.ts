import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionTotalFiat } from './useTransactionTotalFiat';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { toHex } from '@metamask/controller-utils';
import { TransactionBridgeQuote } from '../../utils/bridge';

jest.mock('../gas/useTransactionMaxGasCost');
jest.mock('./useTransactionRequiredFiat');
jest.mock('./useTransactionRequiredTokens');

function runHook({ quotes }: { quotes?: TransactionBridgeQuote[] } = {}) {
  return renderHookWithProvider(useTransactionTotalFiat, {
    state: merge(
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        confirmationMetrics: {
          transactionBridgeQuotesById: {
            '699ca2f0-e459-11ef-b6f6-d182277cf5e1': quotes ?? [],
          },
        },
      },
    ),
  });
}

describe('useTransactionTotalFiat', () => {
  const useTransactionMaxGasCostMock = jest.mocked(useTransactionMaxGasCost);

  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  const useTransactionRequiredFiatMock = jest.mocked(
    useTransactionRequiredFiat,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMaxGasCostMock.mockReturnValue('0x0');

    useTransactionRequiredFiatMock.mockReturnValue({
      values: [],
      totalFiat: 0,
      totalWithBalanceFiat: 0,
    });

    useTransactionRequiredTokensMock.mockReturnValue([]);
  });

  it('includes gas cost', () => {
    useTransactionMaxGasCostMock.mockReturnValue(toHex('12345600000000000'));

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      value: 123.456,
      formatted: '$123.46',
    });
  });

  it('includes quotes cost', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [],
      totalFiat: 0,
      totalWithBalanceFiat: 456.123,
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      value: 456.123,
      formatted: '$456.12',
    });
  });

  it('includes quotes gas cost', () => {
    const { result } = runHook({
      quotes: [
        {
          totalMaxNetworkFee: {
            valueInCurrency: '123.456',
          },
        },
        {
          totalMaxNetworkFee: {
            valueInCurrency: '456.123',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current).toStrictEqual({
      value: 579.579,
      formatted: '$579.58',
    });
  });
});
