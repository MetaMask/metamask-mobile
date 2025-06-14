import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import SnapAccountDetails from './';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { MultichainDeleteAccountsSelectors } from '../../../../../../../e2e/specs/multichainAccounts/delete-account';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ExportCredentialsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/ExportCredentials.selectors';

const mockIsHDOrFirstPartySnapAccount = jest.fn().mockReturnValue(true);
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

// jest.mock('../../../../../../util/address', () => ({
//   ...jest.requireActual('../../../../../../util/address'),
//   isHDOrFirstPartySnapAccount: (account: InternalAccount) =>
//     mockIsHDOrFirstPartySnapAccount(account),
// }));

const mockFirstPartySnapAccount = createMockInternalAccount(
  '0x1234567890123456789012345678901234567890',
  'First Party Snap Account',
  KeyringTypes.snap,
  EthAccountType.Eoa,
);

const mockThirdPartySnapAccount = createMockInternalAccount(
  '0x9876543210987654321098765432109876543210',
  'Third Party Snap Account',
  KeyringTypes.snap,
  EthAccountType.Eoa,
);

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockFirstPartySnapAccount.id]: mockFirstPartySnapAccount,
            [mockThirdPartySnapAccount.id]: mockThirdPartySnapAccount,
          },
        },
      },
      KeyringController: {
        keyrings: [
          {
            accounts: [mockFirstPartySnapAccount.address],
            type: KeyringTypes.snap,
            metadata: {
              id: 'mock-id-snap',
              name: 'mock-name-snap',
            },
          },
        ],
      },
    },
  },
};

describe('SnapAccountDetails', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders BaseAccountDetails wrapper', () => {
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <SnapAccountDetails account={mockThirdPartySnapAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it.each([
    {
      description: 'first party snap account',
      account: mockFirstPartySnapAccount,
      isFirstParty: true,
      shouldShowExportCredentials: true,
      shouldShowRemoveAccount: false,
    },
    {
      description: 'third party snap account',
      account: mockThirdPartySnapAccount,
      isFirstParty: false,
      shouldShowExportCredentials: false,
      shouldShowRemoveAccount: true,
    },
  ])(
    'handles $description correctly',
    ({
      account,
      isFirstParty,
      shouldShowExportCredentials,
      shouldShowRemoveAccount,
    }) => {
      mockIsHDOrFirstPartySnapAccount.mockReturnValue(isFirstParty);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <SnapAccountDetails account={account} />,
        { state: mockInitialState },
      );

      // Always expect BaseAccountDetails to be present
      expect(
        getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
      ).toBeTruthy();

      // Check ExportCredentials visibility
      if (shouldShowExportCredentials) {
        expect(getByTestId(ExportCredentialsIds.CONTAINER)).toBeTruthy();
      } else {
        expect(queryByTestId(ExportCredentialsIds.CONTAINER)).toBeNull();
      }

      // Check RemoveAccount visibility
      if (shouldShowRemoveAccount) {
        expect(
          getByTestId(
            MultichainDeleteAccountsSelectors.deleteAccountRemoveButton,
          ),
        ).toBeTruthy();
      } else {
        expect(
          queryByTestId(
            MultichainDeleteAccountsSelectors.deleteAccountRemoveButton,
          ),
        ).toBeNull();
      }
    },
  );

  it('calls isHDOrFirstPartySnapAccount with correct account', () => {
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(true);

    renderWithProvider(
      <SnapAccountDetails account={mockFirstPartySnapAccount} />,
      { state: mockInitialState },
    );

    expect(mockIsHDOrFirstPartySnapAccount).toHaveBeenCalledWith(
      mockFirstPartySnapAccount,
    );
  });
});
