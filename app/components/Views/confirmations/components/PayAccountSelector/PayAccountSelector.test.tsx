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
import { useTransactionAccountOverride } from '../../hooks/transactions/useTransactionAccountOverride';
import { replaceAccountInNestedTransactions } from '../../utils/transaction-pay';
import PayAccountSelector from './PayAccountSelector';

jest.mock('../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../hooks/transactions/useTransactionAccountOverride');
jest.mock('../../utils/transaction-pay', () => ({
  replaceAccountInNestedTransactions: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

let mockAccountToSelect = {
  id: 'selected-account-id',
  address: '0xSelectedAddress',
};

jest.mock('../AccountSelector', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onAccountSelected,
      selectedAddress,
      label,
    }: {
      onAccountSelected: (account: { id: string; address: string }) => void;
      selectedAddress?: string;
      label?: string;
    }) => (
      <TouchableOpacity
        testID="account-selector"
        onPress={() => onAccountSelected(mockAccountToSelect)}
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
const useTransactionAccountOverrideMock = jest.mocked(
  useTransactionAccountOverride,
);
const replaceAccountInNestedTransactionsMock = jest.mocked(
  replaceAccountInNestedTransactions,
);
const MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE =
  TransactionType.membershipSubscription;
const SELECTED_ACCOUNT_ID_MOCK = 'selected-account-id';
const HARDWARE_RECIPIENT_ACCOUNTS = [
  {
    address: '0x3333333333333333333333333333333333333333' as Hex,
    id: 'ledger-account-id',
    label: 'Ledger',
  },
  {
    address: '0x4444444444444444444444444444444444444444' as Hex,
    id: 'qr-account-id',
    label: 'QR',
  },
  {
    address: '0x5555555555555555555555555555555555555555' as Hex,
    id: 'onekey-account-id',
    label: 'OneKey',
  },
];

const setTransactionConfigMock = jest.mocked(
  Engine.context.TransactionPayController.setTransactionConfig,
);

function render() {
  return renderWithProvider(<PayAccountSelector />, {
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
    mockAccountToSelect = {
      id: SELECTED_ACCOUNT_ID_MOCK,
      address: '0xSelectedAddress',
    };

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    useTransactionAccountOverrideMock.mockReturnValue(undefined);
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

  it('renders with no pre-selected address when accountOverride is undefined', () => {
    const { getByTestId } = render();

    expect(getByTestId('account-selector-address')).toHaveTextContent(
      'No selection',
    );
  });

  it('renders with pre-selected address from accountOverride', () => {
    useTransactionAccountOverrideMock.mockReturnValue('0xOverrideAddress');

    const { getByTestId } = render();

    expect(getByTestId('account-selector-address')).toHaveTextContent(
      '0xOverrideAddress',
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

  it('treats membership subscriptions like money account deposits', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId } = render();

    expect(getByTestId('account-selector-label')).toHaveTextContent('From');
  });

  it.each(HARDWARE_RECIPIENT_ACCOUNTS)(
    'keeps a preselected $label hardware recipient for withdraw transactions',
    ({ address }) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'mock-tx-id',
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: '0x1111111111111111111111111111111111111111' },
        nestedTransactions: [{ data: '0xabcd' }],
      } as never);
      useTransactionAccountOverrideMock.mockReturnValue(address);

      const { getByTestId } = render();

      expect(getByTestId('account-selector-address')).toHaveTextContent(
        address,
      );
      expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    },
  );

  it.each(HARDWARE_RECIPIENT_ACCOUNTS)(
    'sets accountOverride and rewrites nested transactions when selecting a $label recipient for withdraw',
    async ({ address, id }) => {
      const nestedTransactions = [{ data: '0xabcd' }];
      mockAccountToSelect = { id, address };
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'mock-tx-id',
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: '0x1111111111111111111111111111111111111111' },
        nestedTransactions,
      } as never);
      useTransactionAccountOverrideMock.mockReturnValue('0xOverrideAddress');

      const { getByTestId } = render();

      await act(async () => {
        fireEvent.press(getByTestId('account-selector'));
      });

      expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
        transactionId: 'mock-tx-id',
        nestedTransactions,
        oldAddress: '0xOverrideAddress',
        newAddress: address,
      });

      const config = {} as { accountOverride?: string };
      setTransactionConfigMock.mock.calls[0][1](config);

      expect(config.accountOverride).toBe(id);
    },
  );

  it('rewrites nested transactions when switching withdraw recipient from hardware to software', async () => {
    const nestedTransactions = [{ data: '0xabcd' }];
    const ledgerAddress = HARDWARE_RECIPIENT_ACCOUNTS[0].address;
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0x1111111111111111111111111111111111111111' },
      nestedTransactions,
    } as never);
    useTransactionAccountOverrideMock.mockReturnValue(ledgerAddress);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions,
      oldAddress: ledgerAddress,
      newAddress: '0xSelectedAddress',
    });

    const config = {} as { accountOverride?: string };
    setTransactionConfigMock.mock.calls[0][1](config);

    expect(config.accountOverride).toBe(SELECTED_ACCOUNT_ID_MOCK);
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
    const config = {} as { accountOverride?: string; isPostQuote?: boolean };
    configCallback(config);

    expect(config.accountOverride).toBe(SELECTED_ACCOUNT_ID_MOCK);
  });

  it('sets accountOverride for withdraw transactions', async () => {
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
    const config = {} as { accountOverride?: string; isPostQuote?: boolean };
    configCallback(config);

    expect(config.accountOverride).toBe(SELECTED_ACCOUNT_ID_MOCK);
    expect(config.isPostQuote).toBeUndefined();
  });

  it('does not set isPostQuote for deposit transactions', async () => {
    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    const configCallback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { accountOverride?: string; isPostQuote?: boolean };
    configCallback(config);

    expect(config.accountOverride).toBe(SELECTED_ACCOUNT_ID_MOCK);
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
    expect(replaceAccountInNestedTransactionsMock).not.toHaveBeenCalled();
  });

  it('rewrites nested transactions using existing accountOverride as the old address', async () => {
    const nestedTransactions = [{ data: '0xabcd' }];
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0xFromAddress' },
      nestedTransactions,
    } as never);
    useTransactionAccountOverrideMock.mockReturnValue('0xOverrideAddress');

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions,
      oldAddress: '0xOverrideAddress',
      newAddress: '0xSelectedAddress',
    });
  });

  it('rewrites nested transactions using txParams.from when no accountOverride is set', async () => {
    const nestedTransactions = [{ data: '0xabcd' }];
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0xFromAddress' },
      nestedTransactions,
    } as never);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions,
      oldAddress: '0xFromAddress',
      newAddress: '0xSelectedAddress',
    });
  });
});
