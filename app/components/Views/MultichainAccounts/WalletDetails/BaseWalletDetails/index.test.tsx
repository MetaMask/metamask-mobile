import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { BaseWalletDetails } from './index';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { WalletDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';
import { useWalletInfo } from '../hooks/useWalletInfo';
import { RootState } from '../../../../../reducers';

jest.mock('../utils/getInternalAccountsFromWallet');
jest.mock('../hooks/useWalletBalances');
jest.mock('../hooks/useWalletInfo');

// Mock the dependencies of WalletAddAccountActions instead of the component itself
jest.mock('../../../../../actions/multiSrp', () => ({
  addNewHdAccount: jest.fn(),
}));

jest.mock('../../../../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  MultichainWalletSnapFactory: {
    createClient: jest.fn(),
  },
  WalletClientType: {
    Solana: 'solana',
  },
}));

const mockGetInternalAccountsFromWallet =
  getInternalAccountsFromWallet as jest.Mock;
const mockUseWalletBalances = useWalletBalances as jest.Mock;
const mockUseWalletInfo = useWalletInfo as jest.Mock;

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
} as unknown as AccountWalletObject;

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
    mockUseWalletInfo.mockReturnValue({
      accounts: [mockAccount1, mockAccount2],
      keyringId: 'keyring:1',
      srpIndex: 1,
      isSRPBackedUp: true,
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

  it('does not render add account button when keyringId is not present', () => {
    mockUseWalletInfo.mockReturnValue({
      accounts: [mockAccount1, mockAccount2],
      keyringId: null,
      srpIndex: 1,
      isSRPBackedUp: true,
    });

    const { queryByTestId } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    expect(queryByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON)).toBeNull();
  });

  describe('Add Account Feature', () => {
    it('renders add account button when keyringId is available', () => {
      const { getByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(getByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON)).toBeTruthy();
    });

    it('does not render add account button when keyringId is null', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
        srpIndex: 1,
        isSRPBackedUp: true,
      });

      const { queryByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(queryByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON)).toBeNull();
    });

    it('opens add account modal when add account button is pressed', () => {
      const { getByTestId, queryByText, getByText } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      // Modal should not be visible initially
      expect(queryByText('Create a new account')).toBeNull();

      const addAccountButton = getByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON);
      fireEvent.press(addAccountButton);

      // Modal should be visible after pressing add account button
      expect(getByText('Create a new account')).toBeTruthy();
    });

    it('shows Ethereum and Solana account options in modal', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      const addAccountButton = getByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON);
      fireEvent.press(addAccountButton);

      // Check that both account options are rendered
      expect(getByText('Ethereum account')).toBeTruthy();
      expect(getByText('Solana account')).toBeTruthy();
    });

    it('does not open modal when keyringId is null and button is pressed', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
        srpIndex: 1,
        isSRPBackedUp: true,
      });

      const { queryByTestId, queryByText } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      // Button should not be rendered when keyringId is null
      expect(queryByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON)).toBeNull();
      expect(queryByText('Create a new account')).toBeNull();
    });
  });

  describe('SRP Reveal Section', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('renders SRP reveal section when keyringId is available', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(getByTestId(WalletDetailsIds.REVEAL_SRP_BUTTON)).toBeTruthy();
      expect(getByText('Reveal Recovery Phrase 1')).toBeTruthy();
    });

    it('does not render SRP reveal section when keyringId is null', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
        srpIndex: 1,
        isSRPBackedUp: true,
      });

      const { queryByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(queryByTestId(WalletDetailsIds.REVEAL_SRP_BUTTON)).toBeNull();
    });

    describe('when SRP is not backed up', () => {
      beforeEach(() => {
        mockUseWalletInfo.mockReturnValue({
          accounts: [mockAccount1, mockAccount2],
          keyringId: 'keyring:1',
          srpIndex: 2,
          isSRPBackedUp: false,
        });
      });

      it('renders backup warning text', () => {
        const { getByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(getByText('Reveal Recovery Phrase 2')).toBeTruthy();
        expect(getByText('Back up')).toBeTruthy();
      });

      it('navigates to backup flow when backup text is pressed', () => {
        const { getByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const backupText = getByText('Back up');
        fireEvent.press(backupText);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.SET_PASSWORD_FLOW.ROOT,
          {
            screen: Routes.SET_PASSWORD_FLOW.MANUAL_BACKUP_STEP_1,
            params: { backupFlow: true },
          },
        );
      });

      it('navigates to SRP reveal quiz when reveal button is pressed', () => {
        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const srpRevealButton = getByTestId(WalletDetailsIds.REVEAL_SRP_BUTTON);
        fireEvent.press(srpRevealButton);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.MODAL.SRP_REVEAL_QUIZ,
            keyringId: 'keyring:1',
          },
        );
      });
    });

    describe('when SRP is backed up', () => {
      beforeEach(() => {
        mockUseWalletInfo.mockReturnValue({
          accounts: [mockAccount1, mockAccount2],
          keyringId: 'keyring:1',
          srpIndex: 1,
          isSRPBackedUp: true,
        });
      });

      it('does not render backup warning text', () => {
        const { queryByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(queryByText('Back up')).toBeNull();
      });

      it('renders only the reveal SRP text without backup warning', () => {
        const { getByText, queryByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(getByText('Reveal Recovery Phrase 1')).toBeTruthy();
        expect(queryByText('Back up')).toBeNull();
      });

      it('navigates to SRP reveal quiz when reveal button is pressed', () => {
        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const srpRevealButton = getByTestId(WalletDetailsIds.REVEAL_SRP_BUTTON);
        fireEvent.press(srpRevealButton);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.MODAL.SRP_REVEAL_QUIZ,
            keyringId: 'keyring:1',
          },
        );
      });
    });

    describe('when SRP backup status is undefined (non-primary SRP)', () => {
      beforeEach(() => {
        mockUseWalletInfo.mockReturnValue({
          accounts: [mockAccount1, mockAccount2],
          keyringId: 'keyring:2',
          srpIndex: 2,
          isSRPBackedUp: undefined,
        });
      });

      it('does not render backup warning text', () => {
        const { queryByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(queryByText('Back up')).toBeNull();
      });

      it('renders only the reveal SRP text without backup warning', () => {
        const { getByText, queryByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(getByText('Reveal Recovery Phrase 2')).toBeTruthy();
        expect(queryByText('Back up')).toBeNull();
      });

      it('navigates to SRP reveal quiz when reveal button is pressed', () => {
        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const srpRevealButton = getByTestId(WalletDetailsIds.REVEAL_SRP_BUTTON);
        fireEvent.press(srpRevealButton);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.MODAL.SRP_REVEAL_QUIZ,
            keyringId: 'keyring:2',
          },
        );
      });
    });

    it('displays correct SRP index in button text', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: 'keyring:1',
        srpIndex: 3,
        isSRPBackedUp: true,
      });

      const { getByText } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(getByText('Reveal Recovery Phrase 3')).toBeTruthy();
    });

    it('does not navigate when keyringId is null and button is pressed', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
        srpIndex: 1,
        isSRPBackedUp: true,
      });

      const { queryByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      // Button should not be rendered at all
      expect(queryByTestId(WalletDetailsIds.REVEAL_SRP_BUTTON)).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
