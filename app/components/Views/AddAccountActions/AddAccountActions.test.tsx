import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AddAccountBottomSheetSelectorsIDs } from './AddAccountBottomSheet.testIds';
import AddAccountActions from './AddAccountActions';
import { addNewHdAccount } from '../../../actions/multiSrp';
import {
  createMockInternalAccount,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MOCK_KEYRING_CONTROLLER } from '../../../selectors/keyringController/testUtils';
import { Text } from 'react-native';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import { RootState } from '../../../reducers';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { TrxScope } from '@metamask/keyring-api';

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
  useMetrics: jest.fn(),
}));

jest.mock('../../../actions/multiSrp', () => ({
  addNewHdAccount: jest.fn(),
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
};

const mockProps = {
  onBack: jest.fn(),
  onAddHdAccount: jest.fn(),
};

describe('AddAccountActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });
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
      screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
      ),
    ).toBeDefined();
    expect(
      screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
      ),
    ).toBeDefined();

    // Check for multichain options
    expect(screen.getByText('Solana account')).toBeDefined();
    expect(screen.getByText('Bitcoin account')).toBeDefined();
  });

  it('creates new ETH account when clicking add new account', async () => {
    const mockNewAddress = '0x123';
    (addNewHdAccount as jest.Mock).mockResolvedValueOnce(mockNewAddress);

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
      AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
    );
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(addNewHdAccount).toHaveBeenCalled();
      expect(mockProps.onBack).toHaveBeenCalled();
    });
  });

  it('handles error when creating new ETH account fails', async () => {
    const mockError = new Error('Failed to create account');
    (addNewHdAccount as jest.Mock).mockRejectedValueOnce(mockError);

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
      AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
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
      'Hardware wallet',
    );
    fireEvent.press(hardwareWalletButton);

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT);
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it('navigates to import SRP screen and tracks event when clicking import SRP', () => {
    renderScreen(
      () => <AddAccountActions {...mockProps} />,
      {
        name: 'AddAccountActions',
      },
      {
        state: mockInitialState,
      },
    );

    const importSrpButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
    );
    fireEvent.press(importSrpButton);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
      ).build(),
    );
    expect(mockedNavigate).toHaveBeenCalledWith(Routes.MULTI_SRP.IMPORT);
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  describe('Multichain account creation', () => {
    it.each([
      {
        button: AddAccountBottomSheetSelectorsIDs.ADD_BITCOIN_ACCOUNT_BUTTON,
        scope: MultichainNetwork.Bitcoin,
        clientType: WalletClientType.Bitcoin,
      },
      {
        button: AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON,
        scope: MultichainNetwork.Solana,
        clientType: WalletClientType.Solana,
      },
      {
        button: AddAccountBottomSheetSelectorsIDs.ADD_TRON_ACCOUNT_BUTTON,
        scope: TrxScope.Mainnet,
        clientType: WalletClientType.Tron,
      },
    ])(
      'navigates to AddAccount screen on press with $scope and $clientType',
      async ({ button, scope, clientType }) => {
        const { getByTestId } = renderScreen(
          () => <AddAccountActions {...mockProps} />,
          {
            name: 'AddAccountActions',
          },
          {
            state: mockInitialState,
          },
        );

        const addButton = getByTestId(button);
        fireEvent.press(addButton);

        expect(mockedNavigate).toHaveBeenCalledWith(Routes.SHEET.ADD_ACCOUNT, {
          scope,
          clientType,
        });
      },
    );
  });

  describe('Multisrp', () => {
    const mockAccountInSecondKeyring = createMockInternalAccount(
      '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      'Account in second hd keyring',
    );
    const mockSecondHdKeyring = {
      type: KeyringTypes.hd,
      accounts: [],
      metadata: {
        id: '',
        name: '',
      },
    };

    const stateWithMultipleHdKeyrings = {
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
                [mockAccountInSecondKeyring.id]: mockAccountInSecondKeyring,
              },
            },
          },
          KeyringController: {
            ...MOCK_KEYRING_CONTROLLER,
            keyrings: [
              ...MOCK_KEYRING_CONTROLLER.keyrings,
              mockSecondHdKeyring,
            ],
          },
        },
      },
    } as unknown as RootState;

    it('navigates to AddAccount screen when there are multiple srps', async () => {
      renderScreen(
        () => <AddAccountActions {...mockProps} />,
        {
          name: 'AddAccountActions',
        },
        {
          state: stateWithMultipleHdKeyrings,
        },
      );

      const addAccountButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
      );
      await fireEvent.press(addAccountButton);

      expect(mockedNavigate).toHaveBeenCalledWith(Routes.SHEET.ADD_ACCOUNT, {});
    });
  });
});
