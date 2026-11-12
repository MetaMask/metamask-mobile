/**
 * Narrow list contract. Wallet headers, the social-row press payload, and the
 * hidden homepage menu are not a screen journey. The onboarding component-view
 * test covers the one-wallet sheet.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { AccountCellIds } from '../../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import { createMockAccountGroup } from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { LinkableSocialAccount } from '../hooks/useLinkableSocialAccounts';
import SocialAccountSectionList from './SocialAccountSectionList';

jest.mock('../../../../selectors/assets/balances', () => {
  const actual = jest.requireActual('../../../../selectors/assets/balances');
  return {
    ...actual,
    selectBalanceByAccountGroup:
      (
        groupId: string,
      ): (() => {
        walletId: string;
        groupId: string;
        totalBalanceInUserCurrency: number;
        userCurrency: string;
      }) =>
      () => ({
        walletId: groupId.split('/')[0],
        groupId,
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      }),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: (): { navigate: jest.Mock } => ({ navigate: jest.fn() }),
}));

const ROW_PREFIX = 'social-account-row';

const groupA = createMockAccountGroup('entropy:wallet-a/0', 'Account A', [
  'account-a',
]);
const groupB = createMockAccountGroup('entropy:wallet-b/0', 'Account B', [
  'account-b',
]);

const accountFor = (
  group: ReturnType<typeof createMockAccountGroup>,
  walletTitle: string,
  id: string,
): LinkableSocialAccount => ({
  id,
  name: group.metadata.name,
  address: '0x1111111111111111111111111111111111111111',
  balanceLabel: '$12.00',
  linkedAddresses: ['eip155:1:0x1111111111111111111111111111111111111111'],
  accountGroup: group,
  walletTitle,
});

const renderList = (
  accounts: LinkableSocialAccount[],
  onSelect: jest.Mock = jest.fn(),
): jest.Mock => {
  renderWithProvider(
    <SocialAccountSectionList
      accounts={accounts}
      onSelect={onSelect}
      rowTestIdPrefix={ROW_PREFIX}
      selectedAccountId={accounts[0]?.id}
    />,
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
  return onSelect;
};

describe('SocialAccountSectionList', () => {
  it('renders account cells without a wallet title when every row is in one wallet', () => {
    const account = accountFor(groupA, 'Wallet A', 'account-a');

    renderList([account]);

    expect(screen.getByTestId(`${ROW_PREFIX}-account-a`)).toHaveTextContent(
      'Account A',
    );
    expect(screen.queryByText('Wallet A')).not.toBeOnTheScreen();
    expect(screen.queryByTestId(AccountCellIds.MENU)).not.toBeOnTheScreen();
  });

  it('renders a wallet title before each wallet when rows come from two wallets', () => {
    renderList([
      accountFor(groupA, 'Wallet A', 'account-a'),
      accountFor(groupB, 'Wallet B', 'account-b'),
    ]);

    expect(screen.getByText('Wallet A')).toBeOnTheScreen();
    expect(screen.getByText('Wallet B')).toBeOnTheScreen();
    expect(screen.getByText('Account A')).toBeOnTheScreen();
    expect(screen.getByText('Account B')).toBeOnTheScreen();
  });

  it('returns the social account when a row is pressed', () => {
    const account = accountFor(groupA, 'Wallet A', 'account-a');
    const onSelect = renderList([account]);

    fireEvent.press(screen.getByTestId(`${ROW_PREFIX}-account-a`));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(account);
  });

  it('leaves out the account selector menu and add actions', () => {
    renderList([accountFor(groupA, 'Wallet A', 'account-a')]);

    expect(screen.queryByTestId(AccountCellIds.MENU)).not.toBeOnTheScreen();
    expect(screen.queryByText('Add account')).not.toBeOnTheScreen();
    expect(screen.queryByText('Add wallet')).not.toBeOnTheScreen();
  });

  it('renders the account name and balance when the row has no account group', () => {
    const account: LinkableSocialAccount = {
      id: 'fallback',
      name: 'Imported',
      address: '0x2222222222222222222222222222222222222222',
      balanceLabel: '$4.00',
      linkedAddresses: ['eip155:1:0x2222222222222222222222222222222222222222'],
      accountGroup: null,
      walletTitle: '',
    };
    const onSelect = renderList([account]);

    fireEvent.press(screen.getByTestId(`${ROW_PREFIX}-fallback`));

    expect(screen.getByTestId(`${ROW_PREFIX}-fallback`)).toHaveTextContent(
      'Imported$4.00',
    );
    expect(onSelect).toHaveBeenCalledWith(account);
    expect(screen.queryByTestId(AccountCellIds.MENU)).not.toBeOnTheScreen();
  });
});
