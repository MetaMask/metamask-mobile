import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { TransactionType } from '@metamask/transaction-controller';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { updateTransaction } from '../../../../../../util/transaction-controller';
import { PerpsAccountPickerSelectorsIDs } from '../../../ConfirmationView.testIds';
import {
  usePerpsSubAccounts,
  type SubAccountInfo,
} from '../../../hooks/transactions/usePerpsSubAccounts';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { PerpsAccountPickerRow } from './perps-account-picker-row';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/transactions/usePerpsSubAccounts', () => ({
  usePerpsSubAccounts: jest.fn(),
}));
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(() => jest.fn()),
}));
jest.mock('../../../../../../util/transaction-controller', () => ({
  updateTransaction: jest.fn(),
}));
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PerpsController: {},
  },
}));
jest.mock('../../../../../UI/Perps/utils/formatUtils', () => ({
  formatPerpsBalance: (val: string) => `$${val}`,
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

const MOCK_ACCOUNTS: SubAccountInfo[] = [
  {
    id: '0xabc',
    name: 'Account 1 (Perps)',
    spendableBalance: '100',
    withdrawableBalance: '50',
    totalBalance: '150',
  },
  {
    id: '0xdef',
    name: 'Account 2 (Perps)',
    spendableBalance: '200',
    withdrawableBalance: '100',
    totalBalance: '300',
  },
];

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

describe('PerpsAccountPickerRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(usePerpsSubAccounts).mockReturnValue({
      subAccounts: MOCK_ACCOUNTS,
      selectedSubAccount: MOCK_ACCOUNTS[0],
    });

    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsDeposit,
    } as never);

    jest.mocked(useParams).mockReturnValue({
      payWithOption: 'money_account',
    });
  });

  it('renders when perps deposit with MoneyAccount option', () => {
    const { getByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(getByTestId(PerpsAccountPickerSelectorsIDs.ROW)).toBeDefined();
  });

  it('renders nothing when not a perps deposit', () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'tx-1',
      type: TransactionType.simpleSend,
    } as never);

    const { queryByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PerpsAccountPickerSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when payWithOption is not MoneyAccount', () => {
    jest.mocked(useParams).mockReturnValue({});

    const { queryByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PerpsAccountPickerSelectorsIDs.ROW)).toBeNull();
  });

  it('renders nothing when no sub-accounts available', () => {
    jest.mocked(usePerpsSubAccounts).mockReturnValue({
      subAccounts: [],
      selectedSubAccount: null,
    });

    const { queryByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PerpsAccountPickerSelectorsIDs.ROW)).toBeNull();
  });

  it('displays the selected account name', () => {
    const { getByText } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(getByText('Account 1 (Perps)')).toBeDefined();
  });

  it('opens picker on row press', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsAccountPickerRow />,
      { state: STATE_MOCK },
    );

    expect(queryByTestId(PerpsAccountPickerSelectorsIDs.SHEET)).toBeNull();

    fireEvent.press(getByTestId(PerpsAccountPickerSelectorsIDs.ROW));

    expect(getByTestId(PerpsAccountPickerSelectorsIDs.SHEET)).toBeDefined();
  });

  it('calls updateTransaction with updated from address on account selection', () => {
    const { getByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    fireEvent.press(getByTestId(PerpsAccountPickerSelectorsIDs.ROW));

    fireEvent.press(
      getByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    );

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
      type: TransactionType.perpsDeposit,
    } as never);

    const { getByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    fireEvent.press(getByTestId(PerpsAccountPickerSelectorsIDs.ROW));

    fireEvent.press(
      getByTestId(`${PerpsAccountPickerSelectorsIDs.ACCOUNT_ITEM}-0xdef`),
    );

    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it('does not render when transactionMeta is undefined', () => {
    jest.mocked(useTransactionMetadataRequest).mockReturnValue(undefined);

    jest.mocked(usePerpsSubAccounts).mockReturnValue({
      subAccounts: MOCK_ACCOUNTS,
      selectedSubAccount: MOCK_ACCOUNTS[0],
    });

    jest.mocked(useParams).mockReturnValue({
      payWithOption: 'money_account',
    });

    const { queryByTestId } = renderWithProvider(<PerpsAccountPickerRow />, {
      state: STATE_MOCK,
    });

    expect(queryByTestId(PerpsAccountPickerSelectorsIDs.ROW)).toBeNull();
  });
});
