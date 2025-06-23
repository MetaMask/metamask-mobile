import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountWallet } from '@metamask/account-tree-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { BaseWalletDetails } from './index';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { WalletDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';
import { RootState } from '../../../../../reducers';

jest.mock('../utils/getInternalAccountsFromWallet');
jest.mock('../hooks/useWalletBalances');

const mockGetInternalAccountsFromWallet =
  getInternalAccountsFromWallet as jest.Mock;
const mockUseWalletBalances = useWalletBalances as jest.Mock;

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

const mockAccount1 = createMockInternalAccount(
  '0x1',
  'Account 1',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);
const mockAccount2 = createMockInternalAccount(
  '0x2',
  'Account 2',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const mockWallet = {
  id: `keyring:1`,
  metadata: {
    name: 'Test Wallet',
  },
  accounts: [mockAccount1, mockAccount2],
  groups: {},
} as unknown as AccountWallet;

const mockInitialState: Partial<RootState> = {
  settings: {
    useBlockieIcon: false,
  },
};

describe('BaseWalletDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInternalAccountsFromWallet.mockReturnValue([
      mockAccount1,
      mockAccount2,
    ]);
    mockUseWalletBalances.mockReturnValue({
      formattedWalletTotalBalance: '$1,234.56',
      multichainBalancesForAllAccounts: {
        [mockAccount1.id]: {
          displayBalance: '$500.00',
          isLoadingAccount: false,
        },
        [mockAccount2.id]: {
          displayBalance: '$734.56',
          isLoadingAccount: false,
        },
      },
    });
  });

  it('renders wallet name, balance, and accounts list', () => {
    const { getByText, getByTestId, getAllByText } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    expect(getByTestId(WalletDetailsIds.WALLET_DETAILS_CONTAINER)).toBeTruthy();
    expect(getAllByText(mockWallet.metadata.name)).toHaveLength(2);
    expect(getByText('$1,234.56')).toBeTruthy();
    expect(getByTestId(WalletDetailsIds.ACCOUNTS_LIST)).toBeTruthy();
    expect(getByText(mockAccount1.metadata.name)).toBeTruthy();
    expect(getByText('$500.00')).toBeTruthy();
    expect(getByText(mockAccount2.metadata.name)).toBeTruthy();
    expect(getByText('$734.56')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    const backButton = getByTestId(WalletDetailsIds.BACK_BUTTON);
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to account details when an account is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    const accountItem = getByTestId(
      `${WalletDetailsIds.ACCOUNT_ITEM}_${mockAccount1.id}`,
    );
    fireEvent.press(accountItem);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS,
      {
        account: mockAccount1,
      },
    );
  });

  it('renders children passed to it', () => {
    const childText = 'I am a child component';
    const { getByText } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet}>
        <Text>{childText}</Text>
      </BaseWalletDetails>,
      { state: mockInitialState },
    );

    expect(getByText(childText)).toBeTruthy();
  });
});
