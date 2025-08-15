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

jest.mock('../gas/useTransactionMaxGasCost');
jest.mock('./useTransactionRequiredFiat');
jest.mock('./useTransactionRequiredTokens');

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
  });

  it('includes quotes cost', () => {
    const { result } = runHook({
      quotes: [
        {
          adjustedReturn: {
            valueInCurrency: '12.34',
          },
          cost: {
            valueInCurrency: '23.45',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '34.56',
          },
        },
        {
          adjustedReturn: {
            valueInCurrency: '45.67',
          },
          cost: {
            valueInCurrency: '56.78',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '67.89',
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current).toStrictEqual({
      value: '240.69',
      formatted: '$240.69',
    });
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

    expect(result.current).toStrictEqual({
      value: '35.79',
      formatted: '$35.79',
    });
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
          adjustedReturn: {
            valueInCurrency: '30',
          },
          cost: {
            valueInCurrency: '40',
          },
          totalMaxNetworkFee: {
            valueInCurrency: '50',
          },
          quote: {
            destAsset: {
              address: ADDRESS_MOCK,
            },
          },
        },
      ] as TransactionBridgeQuote[],
    });

    expect(result.current).toStrictEqual({
      value: '140',
      formatted: '$140',
    });
  });
});
