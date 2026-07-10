import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsPaidWithRow } from './transaction-details-paid-with-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { useFiatOrderStatus } from '../../../hooks/activity/useFiatOrderStatus';
import { PaymentType } from '@consensys/on-ramp-sdk';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext');
jest.mock('../../../hooks/tokens/useTokenWithBalance');
jest.mock('../../../hooks/activity/useFiatOrderStatus');
jest.mock(
  '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ paymentMethodType }: { paymentMethodType: number }) => (
        <Text testID="payment-method-icon">{paymentMethodType}</Text>
      ),
    };
  },
);
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { text: { default: 'rgb(0, 0, 0)' } } }),
}));

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x1';
const TOKEN_SYMBOL_MOCK = 'TST';

function render() {
  return renderWithProvider(<TransactionDetailsPaidWithRow />, {
    state: merge({}, otherControllersMock),
  });
}

describe('TransactionDetailsPaidWithRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);
  const useFiatOrderStatusMock = jest.mocked(useFiatOrderStatus);

  beforeEach(() => {
    jest.resetAllMocks();
    useIsMoneyAccountContextMock.mockReturnValue(false);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          chainId: CHAIN_ID_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    useTokenWithBalanceMock.mockReturnValue({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
      decimals: 6,
      symbol: TOKEN_SYMBOL_MOCK,
    } as unknown as ReturnType<typeof useTokenWithBalance>);

    useFiatOrderStatusMock.mockReturnValue({
      paymentMethodName: undefined,
    } as ReturnType<typeof useFiatOrderStatus>);
  });

  it('renders token symbol', () => {
    const { getByText } = render();
    expect(getByText(TOKEN_SYMBOL_MOCK)).toBeDefined();
  });

  it('renders token icon', () => {
    const { getByTestId } = render();
    expect(getByTestId('token-icon')).toBeDefined();
  });

  it('renders nothing if no payment token', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
      } as unknown as TransactionMeta,
    });

    const { queryByText } = render();

    expect(queryByText(TOKEN_SYMBOL_MOCK)).toBeNull();
  });

  it('renders nothing if token not found', () => {
    useTokenWithBalanceMock.mockReturnValue(undefined);

    const { queryByText } = render();

    expect(queryByText(TOKEN_SYMBOL_MOCK)).toBeNull();
  });

  it('renders nothing for deposit types in money context', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.moneyAccountDeposit,
        metamaskPay: {
          chainId: CHAIN_ID_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });

  describe('fiat deposit path', () => {
    beforeEach(() => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          txParams: { from: '0xSender' },
          metamaskPay: {
            fiat: { orderId: 'order-123', provider: 'moonpay' },
          },
        } as unknown as TransactionMeta,
      });
    });

    it('renders payment method name and icon for fiat deposit', () => {
      useFiatOrderStatusMock.mockReturnValue({
        paymentMethodName: 'Apple Pay',
      } as ReturnType<typeof useFiatOrderStatus>);

      const { getByText, getByTestId } = render();

      expect(getByText('Apple Pay')).toBeDefined();
      expect(getByTestId('payment-method-icon')).toBeDefined();
      expect(getByTestId('payment-method-icon').props.children).toBe(
        PaymentType.ApplePay,
      );
    });

    it('renders nothing when useFiatOrderStatus returns no payment method name', () => {
      useFiatOrderStatusMock.mockReturnValue({
        paymentMethodName: undefined,
      } as ReturnType<typeof useFiatOrderStatus>);

      const { toJSON } = render();
      expect(toJSON()).toBeNull();
    });
  });

  it('passes undefined params to useFiatOrderStatus when not a fiat deposit', () => {
    useIsMoneyAccountContextMock.mockReturnValue(false);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          chainId: CHAIN_ID_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    render();

    expect(useFiatOrderStatusMock).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  describe('inferPaymentType', () => {
    beforeEach(() => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          txParams: { from: '0xSender' },
          metamaskPay: {
            fiat: { orderId: 'order-123', provider: 'moonpay' },
          },
        } as unknown as TransactionMeta,
      });
    });

    it.each([
      ['Apple Pay', PaymentType.ApplePay],
      ['Google Pay', PaymentType.GooglePay],
      ['Bank Transfer', PaymentType.BankTransfer],
      ['Debit Card', PaymentType.DebitCreditCard],
    ])('maps "%s" to the correct PaymentType', (name, expectedType) => {
      useFiatOrderStatusMock.mockReturnValue({
        paymentMethodName: name,
      } as ReturnType<typeof useFiatOrderStatus>);

      const { getByTestId } = render();
      expect(getByTestId('payment-method-icon').props.children).toBe(
        expectedType,
      );
    });
  });
});
