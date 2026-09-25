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
import { isHardwareAccount } from '../../../../../util/address';
import PayAccountSelector from './PayAccountSelector';

jest.mock('../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../hooks/transactions/useTransactionAccountOverride');
jest.mock('../../utils/transaction-pay', () => ({
  replaceAccountInNestedTransactions: jest.fn(),
}));
jest.mock('../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

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
      isAccountAllowed,
    }: {
      onAccountSelected: (address: string) => void;
      selectedAddress?: string;
      label?: string;
      isAccountAllowed?: (account: unknown) => boolean;
    }) => (
      <TouchableOpacity
        testID="account-selector"
        onPress={() => onAccountSelected('0xSelectedAddress')}
      >
        <Text testID="account-selector-label">{label ?? 'To'}</Text>
        <Text testID="account-selector-address">
          {selectedAddress ?? 'No selection'}
        </Text>
        <Text testID="account-selector-filter">
          {isAccountAllowed ? 'Filtered' : 'Unfiltered'}
        </Text>
        <Text testID="hardware-accounts-allowed">
          {String(
            isAccountAllowed?.({
              metadata: { keyring: { type: 'Ledger Hardware' } },
            }) ||
              isAccountAllowed?.({
                metadata: {
                  keyring: { type: 'QR Hardware Wallet Device' },
                },
              }) ||
              isAccountAllowed?.({
                metadata: { keyring: { type: 'OneKey Hardware' } },
              }),
          )}
        </Text>
        <Text testID="software-account-allowed">
          {String(
            isAccountAllowed?.({
              metadata: { keyring: { type: 'HD Key Tree' } },
            }),
          )}
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
const isHardwareAccountMock = jest.mocked(isHardwareAccount);

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
      txParams: { from: '0x123' },
    } as never);

    useTransactionAccountOverrideMock.mockReturnValue(undefined);
    isHardwareAccountMock.mockReturnValue(false);
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
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xOverrideAddress' as Hex,
    );

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
    expect(getByTestId('account-selector-filter')).toHaveTextContent(
      'Filtered',
    );
    expect(getByTestId('hardware-accounts-allowed')).toHaveTextContent('false');
    expect(getByTestId('software-account-allowed')).toHaveTextContent('true');
  });

  it('does not filter recipient accounts for deposit transactions', () => {
    const { getByTestId } = render();

    expect(getByTestId('account-selector-filter')).toHaveTextContent(
      'Unfiltered',
    );
  });

  it('clears a preselected hardware recipient for withdraw transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'mock-tx-id',
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0xMoneyAccount' },
      nestedTransactions: [{ data: '0xabcd' }],
    } as never);
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xHardwareAddress' as Hex,
    );
    isHardwareAccountMock.mockReturnValue(true);

    render();

    expect(isHardwareAccountMock).toHaveBeenCalledWith('0xHardwareAddress');
    expect(replaceAccountInNestedTransactionsMock).toHaveBeenCalledWith({
      transactionId: 'mock-tx-id',
      nestedTransactions: [{ data: '0xabcd' }],
      oldAddress: '0xHardwareAddress',
      newAddress: '0xMoneyAccount',
    });

    const configCallback = setTransactionConfigMock.mock.calls[0][1];
    const config = { accountOverride: '0xHardwareAddress' } as {
      accountOverride?: string;
    };
    configCallback(config as never);

    expect(config.accountOverride).toBeUndefined();
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
    const config = {} as { accountOverride?: Hex; isPostQuote?: boolean };
    configCallback(config as never);

    expect(config.accountOverride).toBe('0xSelectedAddress');
    expect(config.isPostQuote).toBeUndefined();
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
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xOverrideAddress' as Hex,
    );

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
