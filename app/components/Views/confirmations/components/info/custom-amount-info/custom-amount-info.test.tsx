import React from 'react';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CustomAmountInfo } from './custom-amount-info';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { AlertKeys } from '../../../constants/alerts';
import { Alert, Severity } from '../../../types/alerts';
import { act, fireEvent } from '@testing-library/react-native';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import {
  AlertsContextParams,
  useAlerts,
} from '../../../context/alert-system-context';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');
jest.mock('../../../hooks/pay/useAutomaticTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionBridgeQuotes');
jest.mock('../../../hooks/transactions/useTransactionCustomAmount');
jest.mock('../../../context/confirmation-context');
jest.mock('../../../hooks/pay/useTransactionTotalFiat');
jest.mock('../../../context/alert-system-context');
jest.mock('../../../hooks/transactions/useTransactionCustomAmountAlerts');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

function render() {
  return renderWithProvider(<CustomAmountInfo />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('CustomAmountInfo', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);
  const useAlertsMock = jest.mocked(useAlerts);
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);
  const useTransactionCustomAmountAlertsMock = jest.mocked(
    useTransactionCustomAmountAlerts,
  );

  const useTransactionCustomAmountMock = jest.mocked(
    useTransactionCustomAmount,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: '0x123',
        balance: '0',
        balanceFiat: '0',
        balanceRaw: '0',
        chainId: '0x1',
        decimals: 18,
        symbol: 'TST',
        tokenFiatAmount: 0,
      },
      setPayToken: noop,
    });

    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      isInputChanged: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: noop,
    });

    useConfirmationContextMock.mockReturnValue({
      setIsFooterVisible: noop,
    } as ReturnType<typeof useConfirmationContext>);

    useTransactionTotalFiatMock.mockReturnValue(
      {} as ReturnType<typeof useTransactionTotalFiat>,
    );

    useAlertsMock.mockReturnValue({
      alerts: [] as Alert[],
      generalAlerts: [] as Alert[],
      fieldAlerts: [] as Alert[],
    } as AlertsContextParams);

    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertMessage: undefined,
      keyboardAlertMessage: undefined,
      excludeBannerKeys: [],
    });
  });

  it('renders amount', () => {
    const { getByTestId } = render();

    expect(getByTestId('custom-amount-input')).toHaveProp(
      'defaultValue',
      '123.45',
    );
  });

  it('renders payment token', () => {
    const { getByText } = render();
    expect(getByText('TST')).toBeDefined();
  });

  it('renders alert banner', async () => {
    useAlertsMock.mockReturnValue({
      alerts: [] as Alert[],
      generalAlerts: [
        {
          key: AlertKeys.NoPayTokenQuotes,
          message: 'Test Banner Alert',
          isBlocking: true,
          severity: Severity.Danger,
        },
      ],
      fieldAlerts: [] as Alert[],
    } as AlertsContextParams);

    const { getByText } = render();

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(getByText('Test Banner Alert')).toBeDefined();
  });

  it('renders alert message', () => {
    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertMessage: 'Test Alert Message',
      keyboardAlertMessage: undefined,
      excludeBannerKeys: [],
    });

    const { getByText } = render();

    expect(getByText('Test Alert Message')).toBeDefined();
  });

  it('renders quote data', async () => {
    useTransactionTotalFiatMock.mockReturnValue({
      totalFormatted: '$456.78',
      totalTransactionFeeFormatted: '$3.21',
    } as ReturnType<typeof useTransactionTotalFiat>);

    const { getByText } = render();

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(getByText('$456.78')).toBeDefined();
    expect(getByText('$3.21')).toBeDefined();
  });

  it('renders keyboard', () => {
    const { getByTestId } = render();
    expect(getByTestId('deposit-keyboard')).toBeDefined();
  });
});
