import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import AddAccountActions from './AddAccountActions';
import Engine from '../../../core/Engine';
import {
  createMockInternalAccount,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import { BtcAccountType, SolAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MOCK_KEYRING_CONTROLLER } from '../../../selectors/keyringController/testUtils';
import { Text } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';

const mockedNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

const mockTrackEvent = jest.fn();
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      build: () => ({}),
    }),
  }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      addNewAccount: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));

// Mock Logger
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: MOCK_KEYRING_CONTROLLER,
    },
  },
  multichainSettings: {
    bitcoinSupportEnabled: true,
    bitcoinTestnetSupportEnabled: true,
    solanaSupportEnabled: true,
  },
};

const mockProps = {
  onBack: jest.fn(),
};

describe('AddAccountActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('shows all account creation options', () => {
    renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );

    // Check for standard options
    expect(
      screen.getByTestId(AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON),
    ).toBeDefined();
    expect(
      screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
      ),
    ).toBeDefined();

    // Check for multichain options
    expect(screen.getByText('Add a new Solana Account (Beta)')).toBeDefined();
    expect(screen.getByText('Add a new Bitcoin Account (Beta)')).toBeDefined();
    expect(
      screen.getByText('Add a new Bitcoin Account (Testnet)'),
    ).toBeDefined();
  });

  it('creates new ETH account when clicking add new account', async () => {
    const mockNewAddress = '0x123';
    (
      Engine.context.KeyringController.addNewAccount as jest.Mock
    ).mockResolvedValueOnce(mockNewAddress);

    renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );

    const addButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON,
    );
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(Engine.context.KeyringController.addNewAccount).toHaveBeenCalled();
      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(mockNewAddress);
      expect(mockProps.onBack).toHaveBeenCalled();
    });
  });

  it('handles error when creating new ETH account fails', async () => {
    const mockError = new Error('Failed to create account');
    (
      Engine.context.KeyringController.addNewAccount as jest.Mock
    ).mockRejectedValueOnce(mockError);

    renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );

    const addButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON,
    );
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        'error while trying to add a new account',
      );
      expect(mockProps.onBack).toHaveBeenCalled();
    });
  });

  it('navigates to import screen when clicking import account', () => {
    renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );

    const importButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
    );
    fireEvent.press(importButton);

    expect(mockedNavigate).toHaveBeenCalledWith('ImportPrivateKeyView');
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it('navigates to hardware wallet connection when clicking connect hardware wallet', () => {
    renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );

    const hardwareWalletButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.ADD_HARDWARE_WALLET_BUTTON,
    );

    expect(hardwareWalletButton.findByType(Text).props.children).toBe(
      'Add hardware wallet',
    );
    fireEvent.press(hardwareWalletButton);

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT);
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  describe('Multichain account creation', () => {
    const MOCK_SOL_ADDRESS = 'ATrXkbX2eEPuusRoLyRMW88wcPT2aho2Lk3xErnjjFH';
    const MOCK_BTC_MAINNET_ADDRESS =
      'bc1qkv7xptmd7ejmnnd399z9p643updvula5j4g4nd';

    const solAccount = createMockInternalAccount(
      MOCK_SOL_ADDRESS,
      'Solana Account',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    );

    const btcMainnetAccount = createMockInternalAccount(
      MOCK_BTC_MAINNET_ADDRESS,
      'Bitcoin Account',
      KeyringTypes.snap,
      BtcAccountType.P2wpkh,
    );

    it('does not disable Solana account creation when account already exists', () => {
      const stateWithSolAccount = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AccountsController: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE,
              internalAccounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
                accounts: {
                  ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
                  [solAccount.id]: solAccount,
                },
              },
            },
          },
        },
      };

      renderScreen(
        () => <AddAccountActions {...mockProps} />,
        {
          name: 'AddAccountActions',
        },
        {
          state: stateWithSolAccount,
        },
      );

      const solButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON,
      );
      expect(solButton.findByType(Text).props.children).toBe(
        'Add a new Solana Account (Beta)',
      );
      expect(solButton.props.disabled).toBe(false);
    });

    it('disables Bitcoin account creation when account already exists', () => {
      const stateWithBtcAccount = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AccountsController: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE,
              internalAccounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
                accounts: {
                  ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
                  [btcMainnetAccount.id]: btcMainnetAccount,
                },
              },
            },
          },
        },
      };

      renderScreen(
        () => <AddAccountActions {...mockProps} />,
        {
          name: 'AddAccountActions',
        },
        {
          state: stateWithBtcAccount,
        },
      );

      const btcButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_ACCOUNT_BUTTON,
      );
      expect(btcButton.findByType(Text).props.children).toBe(
        'Add a new Bitcoin Account (Beta)',
      );
      expect(btcButton.props.disabled).toBe(true);
    });

    it('handles error when creating Bitcoin account fails', async () => {
      renderScreen(
        () => <AddAccountActions {...mockProps} />,
        {
          name: 'AddAccountActions',
        },
        {
          state: mockInitialState,
        },
      );

      const btcButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_ACCOUNT_BUTTON,
      );
      fireEvent.press(btcButton);

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          expect.any(Error),
          'Bitcoin account creation failed',
        );
        expect(mockProps.onBack).toHaveBeenCalled();
      });
    });

    it('handles error when creating Solana account fails', async () => {
      renderScreen(
        () => <AddAccountActions {...mockProps} />,
        {
          name: 'AddAccountActions',
        },
        {
          state: mockInitialState,
        },
      );

      const solButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON,
      );
      fireEvent.press(solButton);

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          expect.any(Error),
          'Solana account creation failed',
        );
        expect(mockProps.onBack).toHaveBeenCalled();
      });
    });

    it('disables all buttons while loading', async () => {
      renderScreen(
        () => <AddAccountActions {...mockProps} />,
        {
          name: 'AddAccountActions',
        },
        {
          state: mockInitialState,
        },
      );

      const addButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON,
      );
      fireEvent.press(addButton);

      // Check that all buttons are disabled while loading
      expect(
        screen.getByTestId(AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON)
          .props.disabled,
      ).toBe(true);
      expect(
        screen.getByTestId(
          AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
        ).props.disabled,
      ).toBe(true);
      expect(
        screen.getByTestId(
          AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON,
        ).props.disabled,
      ).toBe(true);
      expect(
        screen.getByTestId(
          AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_ACCOUNT_BUTTON,
        ).props.disabled,
      ).toBe(true);
    });
  });
});
