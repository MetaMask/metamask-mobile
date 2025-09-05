import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionTotalFiat } from './useTransactionTotalFiat';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { TransactionBridgeQuote } from '../../utils/bridge';
import { useFeeCalculations } from '../gas/useFeeCalculations';

jest.mock('../gas/useTransactionMaxGasCost');
jest.mock('./useTransactionRequiredFiat');
jest.mock('./useTransactionRequiredTokens');
jest.mock('../gas/useFeeCalculations');

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const ADDRESS_2_MOCK = '0xabcdef1234567890abcdef1234567890abcdef12';

function runHook({ quotes }: { quotes?: TransactionBridgeQuote[] } = {}) {
  return renderHookWithProvider(useTransactionTotalFiat, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        confirmationMetrics: {
          transactionBridgeQuotesById: {
            [transactionIdMock]: quotes ?? [],
          },
        },
      },
    ),
  });
}

describe('useTransactionTotalFiat', () => {
  const useTransactionMaxGasCostMock = jest.mocked(useTransactionMaxGasCost);
  const useFeeCalculationsMock = jest.mocked(useFeeCalculations);

  const useTransactionRequiredFiatMock = jest.mocked(
    useTransactionRequiredFiat,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMaxGasCostMock.mockReturnValue('0x0');

    useTransactionRequiredFiatMock.mockReturnValue({
      values: [],
      totalFiat: 0,
    });

    useFeeCalculationsMock.mockReturnValue({
      estimatedFeeFiatPrecise: '7.89',
    } as ReturnType<typeof useFeeCalculations>);
  });

  it('returns total', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        {
          address: ADDRESS_MOCK,
          amountFiat: 10,
        },
        {
          address: ADDRESS_2_MOCK,
          amountFiat: 20,
        },
      ],
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '30',
          },
          totalNetworkFee: {
            valueInCurrency: '40',
          },
          minToTokenAmount: {
            valueInCurrency: '12.89',
          },
          quote: {
            destAsset: {
              address: ADDRESS_MOCK,
            },
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        total: '95',
        totalFormatted: '$95',
      }),
    );
  });

  it('returns total estimated native cost', () => {
    const { result } = runHook({
      quotes: [
        {
          totalNetworkFee: {
            valueInCurrency: '1.23',
          },
        },
        {
          totalNetworkFee: {
            valueInCurrency: '4.56',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.totalNativeEstimatedFormatted).toBe('$13.68');
  });

  it('returns total estimated network fee', () => {
    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '100',
          },
          minToTokenAmount: {
            valueInCurrency: '90',
          },
          totalNetworkFee: {
            valueInCurrency: '1.23',
          },
        },
        {
          sentAmount: {
            valueInCurrency: '80',
          },
          minToTokenAmount: {
            valueInCurrency: '60',
          },
          totalNetworkFee: {
            valueInCurrency: '2.34',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.totalNetworkFeeEstimatedFormatted).toBe('$3.57');
  });

  it('returns total max network fee', () => {
    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '100',
          },
          minToTokenAmount: {
          minToTokenAmount: {
            valueInCurrency: '90',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '1.23',
          },
        },
        {
          sentAmount: {
            valueInCurrency: '80',
          },
          minToTokenAmount: {
          minToTokenAmount: {
            valueInCurrency: '60',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '2.34',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.totalNetworkFeeMaxFormatted).toBe('$3.57');
  });

  it('returns total bridge fee', () => {
    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '100',
          },
          minToTokenAmount: {
          minToTokenAmount: {
            valueInCurrency: '90',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '1',
          },
        },
        {
          sentAmount: {
            valueInCurrency: '80',
          },
          minToTokenAmount: {
          minToTokenAmount: {
            valueInCurrency: '60',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '2',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.totalBridgeFeeFormatted).toBe('$30');
  });
});
