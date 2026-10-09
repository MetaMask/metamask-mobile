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
  createMockHiddenAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { strings } from '../../../../../locales/i18n';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import type { RootState } from '../../../../reducers';

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

const PRIMARY_ENTROPY_ID = 'primary-entropy';
const PAIRED_ENTROPY_ID = 'paired-entropy';
const UNPAIRED_ENTROPY_ID = 'unpaired-entropy';

const PRIMARY_GROUP_IDS = [
  `entropy:${PRIMARY_ENTROPY_ID}/0`,
  `entropy:${PRIMARY_ENTROPY_ID}/1`,
];
const HIDDEN_GROUP_ID = `entropy:${PRIMARY_ENTROPY_ID}/2`;
const PAIRED_GROUP_ID = `entropy:${PAIRED_ENTROPY_ID}/0`;
const UNPAIRED_GROUP_ID = `entropy:${UNPAIRED_ENTROPY_ID}/0`;

/** `createMockWallet` builds a keyring wallet; the screen only reads entropy ones. */
const entropyWallet = (
  entropySourceId: string,
  groups: AccountGroupObject[],
  name = entropySourceId,
): AccountWalletObject =>
  ({
    ...createMockWallet(`entropy:${entropySourceId}`, entropySourceId, groups),
    type: AccountWalletType.Entropy,
    metadata: { name, entropy: { id: entropySourceId } },
  }) as unknown as AccountWalletObject;

const session = (identifierId: string, pairedIdentifierIds: string[] = []) => ({
  profile: {
    identifierId,
    canonicalProfileId: 'canonical-profile',
    pairedIdentifierIds: pairedIdentifierIds.map((id) => ({ id, type: 'SRP' })),
  },
});

const buildState = ({
  selectedAccountGroupId = PRIMARY_GROUP_IDS[0],
}: { selectedAccountGroupId?: string } = {}) => {
  const primaryGroups = [
    createMockAccountGroup(PRIMARY_GROUP_IDS[0], 'Account 1'),
    createMockAccountGroup(PRIMARY_GROUP_IDS[1], 'Account 2'),
    createMockHiddenAccountGroup(HIDDEN_GROUP_ID, 'Hidden account'),
  ];
  const pairedGroups = [
    createMockAccountGroup(PAIRED_GROUP_ID, 'Paired account'),
  ];
  const unpairedGroups = [
    createMockAccountGroup(UNPAIRED_GROUP_ID, 'Unpaired account'),
  ];

  const state = createMockState(
    [
      entropyWallet(PRIMARY_ENTROPY_ID, primaryGroups, 'Wallet 1'),
      entropyWallet(PAIRED_ENTROPY_ID, pairedGroups, 'Wallet 2'),
      entropyWallet(UNPAIRED_ENTROPY_ID, unpairedGroups, 'Other wallet'),
    ],
    createMockInternalAccountsFromGroups([
      ...primaryGroups,
      ...pairedGroups,
      ...unpairedGroups,
    ]),
  );
  const { backgroundState } = state.engine;

  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...backgroundState,
        AccountTreeController: {
          ...backgroundState.AccountTreeController,
          selectedAccountGroup: selectedAccountGroupId,
        },
        AuthenticationController: {
          ...backgroundState.AuthenticationController,
          isSignedIn: true,
          srpSessionData: {
            [PRIMARY_ENTROPY_ID]: session('primary-identifier', [
              'paired-identifier',
            ]),
            [PAIRED_ENTROPY_ID]: session('paired-identifier'),
            [UNPAIRED_ENTROPY_ID]: session('unpaired-identifier'),
          },
        },
        KeyringController: {
          ...backgroundState.KeyringController,
          isUnlocked: true,
          keyrings: [
            {
              type: ExtendedKeyringTypes.hd,
              accounts: [],
              metadata: { id: PRIMARY_ENTROPY_ID, name: '' },
            },
          ],
        },
      },
    },
  } as unknown as RootState;
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
      within(header).getByText(strings('manage_profile.linked_social_account')),
    ).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('groups accounts under their wallet', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <LinkedSocialAccount />,
      { state: buildState() },
    );

    const primaryWallet = getByTestId(
      LinkedSocialAccountSelectorsIDs.walletSection(
        `entropy:${PRIMARY_ENTROPY_ID}`,
      ),
    );
    const pairedWallet = getByTestId(
      LinkedSocialAccountSelectorsIDs.walletSection(
        `entropy:${PAIRED_ENTROPY_ID}`,
      ),
    );

    expect(within(primaryWallet).getByText('Wallet 1')).toBeOnTheScreen();
    expect(within(primaryWallet).getByText('Account 1')).toBeOnTheScreen();
    expect(within(primaryWallet).getByText('Account 2')).toBeOnTheScreen();
    expect(within(primaryWallet).queryByText('Paired account')).toBeNull();

    expect(within(pairedWallet).getByText('Wallet 2')).toBeOnTheScreen();
    expect(within(pairedWallet).getByText('Paired account')).toBeOnTheScreen();
    expect(queryByText('Other wallet')).toBeNull();
  });

  it('lists the account groups of the primary SRP and the SRPs paired to it', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    [...PRIMARY_GROUP_IDS, PAIRED_GROUP_ID].forEach((groupId) => {
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
      LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[0]),
    );

    expect(within(row).getByText('Account 1')).toBeOnTheScreen();
  });

  it('excludes account groups from SRPs not paired to the profile', () => {
    const { queryByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      queryByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(UNPAIRED_GROUP_ID),
      ),
    ).toBeNull();
  });

  it('excludes hidden account groups', () => {
    const { queryByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      queryByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(HIDDEN_GROUP_ID),
      ),
    ).toBeNull();
  });

  it('renders the formatted fiat balance for a funded account', () => {
    mockBalances[PRIMARY_GROUP_IDS[0]] = 10000;

    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    const row = getByTestId(
      LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[0]),
    );

    expect(within(row).getByText('$10,000.00')).toBeOnTheScreen();
  });

  it('leaves the balance blank for a zero-balance account', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    const row = getByTestId(
      LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[1]),
    );

    expect(within(row).queryByText('$0.00')).toBeNull();
  });

  it('marks the active account group as linked', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[0]),
      ).props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it('selects nothing when the active account group is not eligible', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState({ selectedAccountGroupId: UNPAIRED_GROUP_ID }),
    });

    [...PRIMARY_GROUP_IDS, PAIRED_GROUP_ID].forEach((groupId) => {
      expect(
        getByTestId(LinkedSocialAccountSelectorsIDs.accountRow(groupId)).props
          .accessibilityState,
      ).toEqual({ checked: false });
    });
  });

  it('moves the selection when another account is pressed', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    fireEvent.press(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[1]),
      ),
    );

    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[1]),
      ).props.accessibilityState,
    ).toEqual({ checked: true });
    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[0]),
      ).props.accessibilityState,
    ).toEqual({ checked: false });
  });

  it('exposes each row as a radio', () => {
    const { getByTestId } = renderWithProvider(<LinkedSocialAccount />, {
      state: buildState(),
    });

    expect(
      getByTestId(
        LinkedSocialAccountSelectorsIDs.accountRow(PRIMARY_GROUP_IDS[0]),
      ).props.accessibilityRole,
    ).toBe('radio');
  });
});
