import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SnapAccountDetails } from './SnapAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ExportCredentialsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/ExportCredentials.selectors';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar';

const mockIsHDOrFirstPartySnapAccount = jest.fn();
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

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  isHDOrFirstPartySnapAccount: (account: InternalAccount) =>
    mockIsHDOrFirstPartySnapAccount(account),
}));

const mockHdKeyringsWithSnapAccounts = jest.fn();
jest.mock('../../../../../hooks/useHdKeyringsWithSnapAccounts', () => ({
  useHdKeyringsWithSnapAccounts: () => mockHdKeyringsWithSnapAccounts(),
}));

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
const mockKeyringId = 'keyring-1';
const mockInitialState = {
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
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
    jest.clearAllMocks();
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      {
        accounts: [mockFirstPartySnapAccount.address],
        metadata: { id: mockKeyringId },
      },
    ]);
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

  it('renders ExportCredentials for first party snap account', () => {
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <SnapAccountDetails account={mockFirstPartySnapAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(ExportCredentialsIds.EXPORT_SRP_BUTTON)).toBeTruthy();
    expect(queryByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON)).toBeNull();
  });

  it('renders RemoveAccount for third party snap account', () => {
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(false);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <SnapAccountDetails account={mockThirdPartySnapAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
    expect(queryByTestId(ExportCredentialsIds.EXPORT_SRP_BUTTON)).toBeNull();
    expect(getByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON)).toBeTruthy();
  });

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
