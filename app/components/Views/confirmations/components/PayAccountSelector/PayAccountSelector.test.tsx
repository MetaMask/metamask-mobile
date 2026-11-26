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

const SELECTED_ACCOUNT_ID_MOCK = 'selected-account-id';
const SELECTED_ADDRESS_MOCK =
  '0x2222222222222222222222222222222222222222' as Hex;
const LEDGER_ADDRESS_MOCK = '0x3333333333333333333333333333333333333333' as Hex;
const QR_ADDRESS_MOCK = '0x4444444444444444444444444444444444444444' as Hex;
const ONEKEY_ADDRESS_MOCK = '0x5555555555555555555555555555555555555555' as Hex;
const MONEY_ACCOUNT_ADDRESS_MOCK =
  '0x1111111111111111111111111111111111111111' as Hex;

const HARDWARE_RECIPIENT_ACCOUNTS = [
  {
    address: LEDGER_ADDRESS_MOCK,
    id: 'ledger-account-id',
    label: 'Ledger',
    testId: 'select-ledger-account',
  },
  {
    address: QR_ADDRESS_MOCK,
    id: 'qr-account-id',
    label: 'QR',
    testId: 'select-qr-account',
  },
  {
    address: ONEKEY_ADDRESS_MOCK,
    id: 'onekey-account-id',
    label: 'OneKey',
    testId: 'select-onekey-account',
  },
];

jest.mock('../AccountSelector', () => {
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
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
      <View>
        <TouchableOpacity
          testID="account-selector"
          onPress={() =>
            onAccountSelected({
              id: 'selected-account-id',
              address: '0x2222222222222222222222222222222222222222',
            })
          }
        >
          <Text testID="account-selector-label">{label ?? 'To'}</Text>
          <Text testID="account-selector-address">
            {selectedAddress ?? 'No selection'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="select-ledger-account"
          onPress={() =>
            onAccountSelected({
              id: 'ledger-account-id',
              address: '0x3333333333333333333333333333333333333333',
            })
          }
        />
        <TouchableOpacity
          testID="select-qr-account"
          onPress={() =>
            onAccountSelected({
              id: 'qr-account-id',
              address: '0x4444444444444444444444444444444444444444',
            })
          }
        />
        <TouchableOpacity
          testID="select-onekey-account"
          onPress={() =>
            onAccountSelected({
              id: 'onekey-account-id',
              address: '0x5555555555555555555555555555555555555555',
            })
          }
        />
      </View>
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

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
    } as never);

    useTransactionAccountOverrideMock.mockReturnValue(undefined);
  });

  it('returns null for non-money-account transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.simpleSend,
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
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
    useTransactionAccountOverrideMock.mockReturnValue(SELECTED_ADDRESS_MOCK);

    const { getByTestId } = render();

    expect(getByTestId('account-selector-address')).toHaveTextContent(
      SELECTED_ADDRESS_MOCK,
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
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
    } as never);

    const { getByTestId } = render();

    expect(getByTestId('account-selector-label')).toHaveTextContent('To');
  });

  it('treats membership subscriptions like money account deposits', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE,
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
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
        txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
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
    async ({ address, id, testId }) => {
      const nestedTransactions = [{ data: '0xabcd' }];
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'mock-tx-id',
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
        nestedTransactions,
      } as never);
      useTransactionAccountOverrideMock.mockReturnValue(SELECTED_ADDRESS_MOCK);

      const { getByTestId } = render();

      await act(async () => {
        fireEvent.press(getByTestId(testId));
      });

      expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
        transactionId: 'mock-tx-id',
        nestedTransactions,
        oldAddress: SELECTED_ADDRESS_MOCK,
        newAddress: address,
      });

      const configCallback = setTransactionConfigMock.mock.calls[0][1];
      const config = {} as { accountOverride?: string };
      configCallback(config);

      expect(config.accountOverride).toBe(id);
    },
  );

  it('rewrites nested transactions when switching withdraw recipient from hardware to software', async () => {
    const nestedTransactions = [{ data: '0xabcd' }];
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
      nestedTransactions,
    } as never);
    useTransactionAccountOverrideMock.mockReturnValue(LEDGER_ADDRESS_MOCK);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions,
      oldAddress: LEDGER_ADDRESS_MOCK,
      newAddress: SELECTED_ADDRESS_MOCK,
    });

    const configCallback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { accountOverride?: string };
    configCallback(config);

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
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
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
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
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
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
      nestedTransactions,
    } as never);
    useTransactionAccountOverrideMock.mockReturnValue(LEDGER_ADDRESS_MOCK);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions,
      oldAddress: LEDGER_ADDRESS_MOCK,
      newAddress: SELECTED_ADDRESS_MOCK,
    });
  });

  it('rewrites nested transactions using txParams.from when no accountOverride is set', async () => {
    const nestedTransactions = [{ data: '0xabcd' }];
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: MONEY_ACCOUNT_ADDRESS_MOCK },
      nestedTransactions,
    } as never);

    const { getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('account-selector'));
    });

    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions,
      oldAddress: MONEY_ACCOUNT_ADDRESS_MOCK,
      newAddress: SELECTED_ADDRESS_MOCK,
    });
  });
});
