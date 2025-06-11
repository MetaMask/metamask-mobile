import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HdAccountDetails } from './HdAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { ExportCredentialsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/ExportCredentials.selectors';

const mockIsEvmAccountType = jest.fn();
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

const mockEvmAccount = createMockInternalAccount(
  '0x1234567890123456789012345678901234567890',
  'HD EVM Account',
  KeyringTypes.hd,
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
            [mockEvmAccount.id]: mockEvmAccount,
          },
        },
      },
      KeyringController: {
        keyrings: [
          {
            accounts: [mockEvmAccount.address],
            type: KeyringTypes.hd,
            metadata: {
              id: 'mock-id',
              name: 'mock-name',
            },
          },
        ],
      },
    },
  },
};

describe('HdAccountDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders BaseAccountDetails wrapper', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HdAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('always renders ExportCredentials component', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HdAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId(ExportCredentialsIds.EXPORT_SRP_BUTTON)).toBeTruthy();
    expect(
      getByTestId(ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON),
    ).toBeTruthy();
  });
});
