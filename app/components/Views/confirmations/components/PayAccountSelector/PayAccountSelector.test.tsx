import React, { act } from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';

import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import PayAccountSelector, {
  PayAccountSelectorProps,
} from './PayAccountSelector';

jest.mock('../../hooks/transactions/useTransactionMetadataRequest');

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

jest.mock('../AccountSelector', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onAccountSelected,
      selectedAddress,
      label,
    }: {
      onAccountSelected: (address: string) => void;
      selectedAddress?: string;
      label?: string;
    }) => (
      <TouchableOpacity
        testID="account-selector"
        onPress={() => onAccountSelected('0xSelectedAddress')}
      >
        <Text testID="account-selector-label">{label ?? 'To'}</Text>
        <Text testID="account-selector-address">
          {selectedAddress ?? 'No selection'}
        </Text>
      </TouchableOpacity>
    ),
  };
});

const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);

const setTransactionConfigMock = jest.mocked(
  Engine.context.TransactionPayController.setTransactionConfig,
);

function render(props: PayAccountSelectorProps = {}) {
  return renderWithProvider(<PayAccountSelector {...props} />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('PayAccountSelector', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);
  });

  it('returns null for non-money-account transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.simpleSend,
      txParams: { from: '0x123' },
    } as never);

    const { queryByTestId } = render();
    expect(queryByTestId('account-selector')).toBeNull();
  });

  it('renders with no pre-selected address', () => {
    const { getByTestId } = render();

    expect(getByTestId('account-selector-address')).toHaveTextContent(
      'No selection',
    );
  });

  it('shows "From" label for deposit transactions', () => {
    const { getByTestId } = render();

    expect(getByTestId('account-selector-label')).toHaveTextContent('From');
  });

  it('shows default "To" label for withdraw transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId } = render();

    expect(getByTestId('account-selector-label')).toHaveTextContent('To');
  });

  it('calls setTransactionConfig with accountOverride on account selection', async () => {
    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      'mock-tx-id',
      expect.any(Function),
    );

    const configCallback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { accountOverride?: Hex; isPostQuote?: boolean };
    configCallback(config as never);

    expect(config.accountOverride).toBe('0xSelectedAddress');
  });

  it('sets isPostQuote for withdraw transactions', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    const configCallback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { accountOverride?: Hex; isPostQuote?: boolean };
    configCallback(config as never);

    expect(config.accountOverride).toBe('0xSelectedAddress');
    expect(config.isPostQuote).toBe(true);
  });

  it('does not set isPostQuote for deposit transactions', async () => {
    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    const configCallback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { accountOverride?: Hex; isPostQuote?: boolean };
    configCallback(config as never);

    expect(config.accountOverride).toBe('0xSelectedAddress');
    expect(config.isPostQuote).toBeUndefined();
  });

  it('does not call setTransactionConfig when transactionId is missing', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('invokes onAccountSelected callback with selected address', async () => {
    const onAccountSelected = jest.fn();
    const { getByTestId } = render({ onAccountSelected });

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(onAccountSelected).toHaveBeenCalledWith('0xSelectedAddress');
  });

  it('updates selected address in AccountSelector after selection', async () => {
    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(getByTestId('account-selector-address')).toHaveTextContent(
      '0xSelectedAddress',
    );
  });
});
