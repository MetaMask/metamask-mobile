import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsRetry } from './transaction-details-retry';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useConfirmNavigation } from '../../../hooks/useConfirmNavigation';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/useConfirmNavigation');
jest.mock('../../../hooks/useTokenAmount');

const FIAT_MOCK = '123.45';

const TRANSACTION_META_MOCK = {
  status: TransactionStatus.failed,
  type: TransactionType.perpsDeposit,
} as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetailsRetry />);
}

describe('TransactionDetailsRetry', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useConfirmNavigationMock = jest.mocked(useConfirmNavigation);
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });

    useConfirmNavigationMock.mockReturnValue({
      navigateToConfirmation: jest.fn(),
    });

    useTokenAmountMock.mockReturnValue({
      fiatUnformatted: FIAT_MOCK,
    } as ReturnType<typeof useTokenAmount>);
  });

  it('renders button', () => {
    const { getByText } = render();

    expect(
      getByText(strings('transaction_details.label.retry_button')),
    ).toBeDefined();
  });

  it('does not render if transaction is not a perps deposit', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.simpleSend,
      },
    });

    const { queryByText } = render();

    expect(
      queryByText(strings('transaction_details.label.retry_button')),
    ).toBeNull();
  });

  it('does not render if transaction status is not failed', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        status: TransactionStatus.confirmed,
      },
    });

    const { queryByText } = render();

    expect(
      queryByText(strings('transaction_details.label.retry_button')),
    ).toBeNull();
  });

  it('navigates to confirmation with amount on press', () => {
    const navigateToConfirmation = jest.fn();

    useConfirmNavigationMock.mockReturnValue({
      navigateToConfirmation,
    });

    const { getByText } = render();

    fireEvent.press(
      getByText(strings('transaction_details.label.retry_button')),
    );

    expect(navigateToConfirmation).toHaveBeenCalledWith({
      stack: Routes.PERPS.ROOT,
      amount: FIAT_MOCK,
    });
  });
});
