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

  it('includes quotes cost', () => {
    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '12.34',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '23.45',
          },
        },
        {
          sentAmount: {
            valueInCurrency: '34.56',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '45.67',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        value: '116.02',
        formatted: '$116.02',
      }),
    );
  });

  it('includes balance cost', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        {
          address: ADDRESS_MOCK,
          amountFiat: 12.34,
        },
        {
          address: ADDRESS_2_MOCK,
          amountFiat: 23.45,
        },
      ],
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    const { result } = runHook();

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        value: '35.79',
        formatted: '$35.79',
      }),
    );
  });

  it('ignores balance cost if matching quote', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        {
          address: ADDRESS_MOCK,
          amountFiat: 1000,
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
          totalMaxNetworkFee: {
            valueInCurrency: '40',
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
        value: '90',
        formatted: '$90',
      }),
    );
  });

  it('returns total gas cost', () => {
    const { result } = runHook({
      quotes: [
        {
          totalMaxNetworkFee: {
            valueInCurrency: '1.23',
          },
        },
        {
          totalMaxNetworkFee: {
            valueInCurrency: '4.56',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.totalGasFormatted).toBe('$13.68');
  });

  it('returns quote network fee', () => {
    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '100',
          },
          toTokenAmount: {
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
          toTokenAmount: {
            valueInCurrency: '60',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '2.34',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.quoteNetworkFee).toBe('3.57');
  });

  it('returns bridge fee', () => {
    const { result } = runHook({
      quotes: [
        {
          sentAmount: {
            valueInCurrency: '100',
          },
          toTokenAmount: {
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
          toTokenAmount: {
            valueInCurrency: '60',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '2',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current.bridgeFeeFormatted).toBe('$30.00');
  });
});
