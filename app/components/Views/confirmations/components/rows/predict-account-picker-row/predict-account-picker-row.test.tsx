import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { TransactionType } from '@metamask/transaction-controller';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { updateTransaction } from '../../../../../../util/transaction-controller';
import { replaceAccountInNestedTransactions } from '../../../utils/transaction-pay';
import { PredictAccountPickerSelectorsIDs } from '../../../ConfirmationView.testIds';
import {
  usePredictSubAccounts,
  type PredictSubAccountInfo,
} from '../../../hooks/transactions/usePredictSubAccounts';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { PredictAccountPickerRow } from './predict-account-picker-row';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/transactions/usePredictSubAccounts', () => ({
  usePredictSubAccounts: jest.fn(),
}));
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(() => jest.fn()),
}));
jest.mock('../../../../../../util/transaction-controller', () => ({
  updateTransaction: jest.fn(),
}));
jest.mock('../../../utils/transaction-pay', () => ({
  replaceAccountInNestedTransactions: jest.fn(),
}));
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {},
  },
}));
jest.mock('../../../../../UI/Predict/utils/format', () => ({
  formatCurrencyValue: (val: number) => `$${val.toFixed(2)}`,
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../../component-library/hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      rowContainer: {},
      row: {},
      valueContainer: {},
      modalRoot: {},
      searchContainer: {},
      searchInput: {},
      list: {},
      accountItem: {},
      accountItemSelected: {},
      accountItemLeft: {},
    },
  }),
}));

jest.mock('../../../../../../util/theme/themeUtils', () => ({
  useElevatedSurface: () => 'surface-elevated',
}));

jest.mock('../../../../../../component-library/components/Icons/Icon', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RR = require('react');
  const MockIcon = (props: Record<string, unknown>) =>
    RR.createElement(RN.View, { testID: `mock-icon-${props.name}` });
  MockIcon.displayName = 'MockIcon';
  return {
    __esModule: true,
    default: MockIcon,
    IconColor: { Alternative: 'Alternative' },
    IconName: { Search: 'Search', ArrowDown: 'ArrowDown' },
    IconSize: { Sm: 'Sm', Md: 'Md' },
  };
});

jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar',
  () => {
    const RN = jest.requireActual('react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RR = require('react');
    const MockAvatar = (props: Record<string, unknown>) =>
      RR.createElement(RN.View, {
        testID: `mock-avatar-${props.accountAddress}`,
      });
    MockAvatar.displayName = 'MockAvatar';
    return {
      __esModule: true,
      default: MockAvatar,
      AvatarSize: { Sm: 'Sm', Md: 'Md' },
      AvatarVariant: { Account: 'Account' },
    };
  },
);

jest.mock('../../../utils/transaction', () => ({
  hasTransactionType: (meta: { type?: string } | undefined, types: string[]) =>
    meta?.type ? types.includes(meta.type) : false,
}));

const MOCK_ACCOUNTS: PredictSubAccountInfo[] = [
  {
    id: '0xabc',
    name: 'Account 1 (Predict)',
    balance: '150',
    walletAddress: '0xproxy_abc',
  },
  {
    id: '0xdef',
    name: 'Account 2 (Predict)',
    balance: '300',
    walletAddress: '0xproxy_def',
  },
];

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

describe('PredictAccountPickerRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(usePredictSubAccounts).mockReturnValue({
      subAccounts: MOCK_ACCOUNTS,
      selectedSubAccount: MOCK_ACCOUNTS[0],
    });

    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'tx-1',
      type: TransactionType.predictDeposit,
    } as never);

    jest.mocked(useParams).mockReturnValue({
      payWithOption: 'money_account',
    });
  });

  it('renders when predict deposit with MoneyAccount option', () => {
    const { getByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(getByTestId(PredictAccountPickerSelectorsIDs.ROW)).toBeDefined();
  });

  it('renders nothing when not a predict deposit', () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'tx-1',
      type: TransactionType.simpleSend,
    } as never);

    const { queryByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PredictAccountPickerSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when payWithOption is not MoneyAccount', () => {
    jest.mocked(useParams).mockReturnValue({});

    const { queryByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PredictAccountPickerSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when no sub-accounts available', () => {
    jest.mocked(usePredictSubAccounts).mockReturnValue({
      subAccounts: [],
      selectedSubAccount: null,
    });

    const { queryByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PredictAccountPickerSelectorsIDs.ROW)).toBeNull();
  });

  it('displays the selected account name', () => {
    const { getByText } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(getByText('Account 1 (Predict)')).toBeDefined();
  });

  it('opens picker on row press', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PredictAccountPickerRow />,
      { state: STATE_MOCK },
    );

    expect(queryByTestId(PredictAccountPickerSelectorsIDs.SHEET)).toBeNull();

    fireEvent.press(getByTestId(PredictAccountPickerSelectorsIDs.ROW));

    expect(getByTestId(PredictAccountPickerSelectorsIDs.SHEET)).toBeDefined();
  });

  it('calls replaceAccountInNestedTransactions and updateTransaction on account selection', () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'tx-1',
      type: TransactionType.predictDeposit,
      nestedTransactions: [{ data: '0xabcd' }],
      txParams: { from: '0xabc' },
    } as never);

    const { getByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    fireEvent.press(getByTestId(PredictAccountPickerSelectorsIDs.ROW));

    fireEvent.press(
      getByTestId(`${PredictAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    );

    expect(replaceAccountInNestedTransactions).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      nestedTransactions: [{ data: '0xabcd' }],
      oldAddress: '0xproxy_abc',
      newAddress: '0xproxy_def',
    });

    expect(updateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-1',
        txParams: expect.objectContaining({ from: '0xdef' }),
      }),
      'tx-1',
    );
  });

  it('does not call updateTransaction when transactionMeta has no id', () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      type: TransactionType.predictDeposit,
    } as never);

    const { getByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    fireEvent.press(getByTestId(PredictAccountPickerSelectorsIDs.ROW));

    fireEvent.press(
      getByTestId(`${PredictAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    );

    expect(updateTransaction).not.toHaveBeenCalled();
    expect(replaceAccountInNestedTransactions).not.toHaveBeenCalled();
  });

  it('does not render when transactionMeta is undefined', () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue(undefined);

    jest.mocked(usePredictSubAccounts).mockReturnValue({
      subAccounts: MOCK_ACCOUNTS,
      selectedSubAccount: MOCK_ACCOUNTS[0],
    });

    jest.mocked(useParams).mockReturnValue({
      payWithOption: 'money_account',
    });

    const { queryByTestId } = renderWithProvider(<PredictAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PredictAccountPickerSelectorsIDs.ROW)).toBeNull();
  });
});
