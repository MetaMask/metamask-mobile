import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { AccountWalletType } from '@metamask/account-api';
import type {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';

import LinkedSocialAccount from './LinkedSocialAccount';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { LinkedSocialAccountSelectorsIDs } from './LinkedSocialAccount.testIds';
import {
  createMockAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { strings } from '../../../../../locales/i18n';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

const mockBalances: Record<string, number> = {};

jest.mock('../../../../selectors/assets/balances', () => ({
  selectBalanceByAccountGroup: (groupId: string) => () => ({
    walletId: 'wallet-1',
    groupId,
    totalBalanceInUserCurrency: mockBalances[groupId] ?? 0,
    userCurrency: 'usd',
  }),
}));

const ENTROPY_GROUP_IDS = ['entropy-group-1', 'entropy-group-2'];
const OTHER_GROUP_ID = 'other-group-1';

/** `createMockWallet` builds a keyring wallet; the screen only reads entropy ones. */
const asEntropyWallet = (wallet: AccountWalletObject): AccountWalletObject =>
  ({ ...wallet, type: AccountWalletType.Entropy }) as AccountWalletObject;

const buildState = ({
  includeSecondWallet = true,
}: { includeSecondWallet?: boolean } = {}) => {
  const entropyGroups: AccountGroupObject[] = [
    createMockAccountGroup(ENTROPY_GROUP_IDS[0], 'Account 1'),
    createMockAccountGroup(ENTROPY_GROUP_IDS[1], 'Account 2'),
  ];
  const otherGroups: AccountGroupObject[] = [
    createMockAccountGroup(OTHER_GROUP_ID, 'Imported account'),
  ];

  const wallets = [
    asEntropyWallet(createMockWallet('wallet-1', 'Wallet 1', entropyGroups)),
    ...(includeSecondWallet
      ? [asEntropyWallet(createMockWallet('wallet-2', 'Wallet 2', otherGroups))]
      : []),
  ];

  const allGroups = includeSecondWallet
    ? [...entropyGroups, ...otherGroups]
    : entropyGroups;

  return createMockState(
    wallets,
    createMockInternalAccountsFromGroups(allGroups),
  );
};

describe('LinkedSocialAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockBalances).forEach((key) => delete mockBalances[key]);
  });

  it('renders the header with the linked social account title', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    const header = getByTestId(LinkedSocialAccountSelectorsIDs.HEADER);
    expect(
      within(header).getByText(
        strings('app_settings.manage_profile.linked_social_account'),
      ),
    ).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('lists the account groups of the first entropy wallet', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    ENTROPY_GROUP_IDS.forEach((groupId) => {
      expect(
        getByTestId(LinkedSocialAccountSelectorsIDs.accountRow(groupId)),
      ).toBeOnTheScreen();
    });
  });

  it('uses the account group name as the row title', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    const row = getByTestId(
      LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[0]),
    );

    expect(within(row).getByText('Account 1')).toBeOnTheScreen();
  });

  it('excludes account groups from other wallets', () => {
    const { queryByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      queryByTestId(LinkedSocialAccountSelectorsIDs.accountRow(OTHER_GROUP_ID)),
    ).toBeNull();
  });

  it('renders the formatted fiat balance for a funded account', () => {
    mockBalances[ENTROPY_GROUP_IDS[0]] = 10000;

    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    const row = getByTestId(
      LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[0]),
    );

    expect(within(row).getByText('$10,000.00')).toBeOnTheScreen();
  });

  it('leaves the balance blank for a zero-balance account', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    const row = getByTestId(
      LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[1]),
    );

    expect(within(row).queryByText('$0.00')).toBeNull();
  });

  it('marks the active account group as linked', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[0]),
      ).props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it('moves the selection when another account is pressed', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    fireEvent.press(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[1]),
      ),
    );

    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[1]),
      ).props.accessibilityState,
    ).toEqual({ checked: true });
    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[0]),
      ).props.accessibilityState,
    ).toEqual({ checked: false });
  });

  it('exposes each row as a radio', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(ENTROPY_GROUP_IDS[0]),
      ).props.accessibilityRole,
    ).toBe('radio');
  });
});
