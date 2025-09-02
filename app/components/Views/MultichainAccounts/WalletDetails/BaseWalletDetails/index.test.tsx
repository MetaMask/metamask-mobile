import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { BaseWalletDetails } from './index';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { WalletDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';
import { useWalletInfo } from '../hooks/useWalletInfo';
import { RootState } from '../../../../../reducers';
import {
  createMockAccountGroup,
  createMockWallet,
} from '../../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  selectAccountTreeControllerState,
  selectAccountGroupsByWallet,
} from '../../../../../selectors/multichainAccounts/accountTreeController';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../utils/getInternalAccountsFromWallet');
jest.mock('../hooks/useWalletBalances');
jest.mock('../hooks/useWalletInfo');

// Mock the multichain accounts feature flag selector
jest.mock(
  '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

// Mock the account tree controller selector
jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountTreeControllerState: jest.fn(),
    selectSelectedAccountGroupId: jest.fn(),
    selectAccountGroupsByWallet: jest.fn(),
    selectAccountGroupWithInternalAccounts: jest.fn(),
  }),
);

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

// Mock Engine to prevent undefined internalAccounts error
jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
    MultichainAccountService: {
      createNextMultichainAccountGroup: jest.fn(),
    },
  },
}));

// Mock InteractionManager and Settings
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
  Settings: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock TurboModuleRegistry to handle SettingsManager
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: (name: string) => {
    if (name === 'SettingsManager') {
      return {
        getConstants: jest.fn(() => ({})),
        setValues: jest.fn(),
        deleteValues: jest.fn(),
      };
    }
    return jest
      .requireActual('react-native/Libraries/TurboModule/TurboModuleRegistry')
      .getEnforcing(name);
  },
  get: (name: string) => {
    if (name === 'SettingsManager') {
      return {
        getConstants: jest.fn(() => ({})),
        setValues: jest.fn(),
        deleteValues: jest.fn(),
      };
    }
    return jest
      .requireActual('react-native/Libraries/TurboModule/TurboModuleRegistry')
      .get?.(name);
  },
}));

const mockGetInternalAccountsFromWallet =
  getInternalAccountsFromWallet as jest.Mock;
const mockUseWalletBalances = useWalletBalances as jest.Mock;
const mockUseWalletInfo = useWalletInfo as jest.Mock;
const mockSelectMultichainAccountsState2Enabled = jest.mocked(
  selectMultichainAccountsState2Enabled,
);
const mockSelectAccountTreeControllerState = jest.mocked(
  selectAccountTreeControllerState,
);

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

const mockAccountGroup1 = createMockAccountGroup(
  'keyring:1/group1',
  'Account Group 1',
  [mockAccount1.id],
);
const mockAccountGroup2 = createMockAccountGroup(
  'keyring:1/group2',
  'Account Group 2',
  [mockAccount2.id],
);

const mockWallet = createMockWallet('1', 'Test Wallet', [
  mockAccountGroup1,
  mockAccountGroup2,
]);

const mockInitialState: Partial<RootState> = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockAccount1.id]: mockAccount1,
            [mockAccount2.id]: mockAccount2,
          },
          selectedAccount: mockAccount1.id,
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      TokenRatesController: {
        marketData: {},
      },
      MultichainAssetsRatesController: {
        conversionRates: {},
        historicalPrices: {},
      },
      MultichainBalancesController: {
        balances: {},
      },
    },
  },
} as unknown as RootState;

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
        [mockAccount1.id]: '$500.00',
        [mockAccount2.id]: '$734.56',
      },
    });
    mockUseWalletInfo.mockReturnValue({
      accounts: [mockAccount1, mockAccount2],
      keyringId: 'keyring:1',
      isSRPBackedUp: true,
    });

    // Mock feature flag to default to false (legacy view)
    (
      mockSelectMultichainAccountsState2Enabled as unknown as jest.Mock
    ).mockReturnValue(false);

    // Mock account tree controller state
    (
      mockSelectAccountTreeControllerState as unknown as jest.Mock
    ).mockReturnValue({
      accountTree: {
        wallets: {
          [mockWallet.id]: {
            groups: {
              group1: mockAccountGroup1,
              group2: mockAccountGroup2,
            },
          },
        },
      },
    });

    // Mock selectAccountGroupsByWallet
    const mockSelectAccountGroupsByWallet = jest.mocked(
      selectAccountGroupsByWallet,
    );
    mockSelectAccountGroupsByWallet.mockReturnValue([
      {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [mockAccountGroup1, mockAccountGroup2],
      },
    ]);
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

  it('renders accounts list container', () => {
    const { getByTestId } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    expect(getByTestId(WalletDetailsIds.ACCOUNTS_LIST)).toBeTruthy();
  });

  it('renders legacy view when multichain accounts state 2 is disabled', () => {
    (
      mockSelectMultichainAccountsState2Enabled as unknown as jest.Mock
    ).mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    expect(getByTestId(WalletDetailsIds.ACCOUNTS_LIST)).toBeTruthy();
  });

  it('renders new view when multichain accounts state 2 is enabled', () => {
    (
      mockSelectMultichainAccountsState2Enabled as unknown as jest.Mock
    ).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <BaseWalletDetails wallet={mockWallet} />,
      { state: mockInitialState },
    );

    expect(getByTestId(WalletDetailsIds.ACCOUNTS_LIST)).toBeTruthy();
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
        isSRPBackedUp: true,
      });

      const { queryByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(queryByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON)).toBeNull();
    });

    it('creates account when add account button is pressed', async () => {
      const { getByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      const addAccountButton = getByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON);

      fireEvent.press(addAccountButton);

      expect(addAccountButton).toBeTruthy();
    });

    it('shows loading state when creating account', async () => {
      const { getByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      const addAccountButton = getByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON);

      fireEvent.press(addAccountButton);

      expect(addAccountButton).toBeTruthy();
    });

    it('does not create account when keyringId is null and button is pressed', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
        isSRPBackedUp: true,
      });

      const { queryByTestId } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      // Button should not be rendered when keyringId is null
      expect(queryByTestId(WalletDetailsIds.ADD_ACCOUNT_BUTTON)).toBeNull();
    });

    describe('handleCreateAccount logic', () => {
      let mockCreateNextMultichainAccountGroup: jest.Mock;

      beforeEach(() => {
        // Mock the Engine context directly
        const Engine = jest.requireMock('../../../../../core/Engine');
        Engine.context.MultichainAccountService.createNextMultichainAccountGroup =
          jest.fn().mockResolvedValue(undefined);

        // Get the mock function
        mockCreateNextMultichainAccountGroup =
          Engine.context.MultichainAccountService
            .createNextMultichainAccountGroup;

        // Mock InteractionManager to run immediately
        const InteractionManager =
          jest.requireMock('react-native').InteractionManager;
        InteractionManager.runAfterInteractions = jest.fn((callback) =>
          callback(),
        );

        // Mock setTimeout
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('creates multichain account group when keyringId is available', async () => {
        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const addAccountButton = getByTestId(
          WalletDetailsIds.ADD_ACCOUNT_BUTTON,
        );
        fireEvent.press(addAccountButton);

        expect(mockCreateNextMultichainAccountGroup).toHaveBeenCalledWith({
          entropySource: 'keyring:1',
        });
      });

      it('handles error when account creation fails', async () => {
        const mockError = new Error('Failed to create account');
        mockCreateNextMultichainAccountGroup.mockRejectedValueOnce(mockError);

        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const addAccountButton = getByTestId(
          WalletDetailsIds.ADD_ACCOUNT_BUTTON,
        );
        fireEvent.press(addAccountButton);

        expect(mockCreateNextMultichainAccountGroup).toHaveBeenCalledWith({
          entropySource: 'keyring:1',
        });
      });

      it('creates multichain account group successfully', async () => {
        mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const addAccountButton = getByTestId(
          WalletDetailsIds.ADD_ACCOUNT_BUTTON,
        );

        fireEvent.press(addAccountButton);

        expect(mockCreateNextMultichainAccountGroup).toHaveBeenCalledWith({
          entropySource: 'keyring:1',
        });
      });

      it('creates legacy account successfully', async () => {
        // Disable multichain accounts state 2 (legacy view)
        mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);

        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const addAccountButton = getByTestId(
          WalletDetailsIds.ADD_ACCOUNT_BUTTON,
        );

        fireEvent.press(addAccountButton);

        expect(mockCreateNextMultichainAccountGroup).toHaveBeenCalledWith({
          entropySource: 'keyring:1',
        });
      });

      it('handles loading state during account creation', async () => {
        const { getByTestId } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        const addAccountButton = getByTestId(
          WalletDetailsIds.ADD_ACCOUNT_BUTTON,
        );

        // Initially not loading
        expect(addAccountButton).toBeEnabled();

        fireEvent.press(addAccountButton);

        // Verify the function was called
        expect(mockCreateNextMultichainAccountGroup).toHaveBeenCalledWith({
          entropySource: 'keyring:1',
        });
      });
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
      expect(getByText('Secret Recovery Phrase')).toBeTruthy();
    });

    it('does not render SRP reveal section when keyringId is null', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
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
          isSRPBackedUp: false,
        });
      });

      it('renders backup warning text', () => {
        const { getByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(getByText('Secret Recovery Phrase')).toBeTruthy();
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

      it('renders only the Secret Recovery Phrase text without backup warning', () => {
        const { getByText, queryByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(getByText('Secret Recovery Phrase')).toBeTruthy();
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

      it('renders only the Secret Recovery Phrase text without backup warning', () => {
        const { getByText, queryByText } = renderWithProvider(
          <BaseWalletDetails wallet={mockWallet} />,
          { state: mockInitialState },
        );

        expect(getByText('Secret Recovery Phrase')).toBeTruthy();
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

    it('displays Secret Recovery Phrase label', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: 'keyring:1',
        isSRPBackedUp: true,
      });

      const { getByText } = renderWithProvider(
        <BaseWalletDetails wallet={mockWallet} />,
        { state: mockInitialState },
      );

      expect(getByText('Secret Recovery Phrase')).toBeTruthy();
    });

    it('does not navigate when keyringId is null and button is pressed', () => {
      mockUseWalletInfo.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        keyringId: null,
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
