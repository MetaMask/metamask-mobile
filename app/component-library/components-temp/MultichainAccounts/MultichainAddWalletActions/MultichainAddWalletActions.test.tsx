import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import MultichainAddWalletActions from './MultichainAddWalletActions';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { MOCK_KEYRING_CONTROLLER } from '../../../../selectors/keyringController/testUtils';
import Routes from '../../../../constants/navigation/Routes';

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
};

describe('MultichainAddWalletActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = renderScreen(
      () => <MultichainAddWalletActions {...mockProps} />,
      {
        name: 'MultichainAddWalletActions',
      },
      {
        state: mockInitialState,
      },
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('shows all wallet creation options', () => {
    renderScreen(
      () => <MultichainAddWalletActions {...mockProps} />,
      {
        name: 'MultichainAddWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    expect(screen.getByText('Import a wallet')).toBeOnTheScreen();
    expect(screen.getByText('Import an account')).toBeOnTheScreen();
    expect(screen.getByText('Add a hardware wallet')).toBeOnTheScreen();
    // TODO: Uncomment when adding new SRP will be implemented
    // expect(screen.getByText('Create a new wallet')).toBeOnTheScreen();
  });

  // TODO: Uncomment when adding new SRP will be implemented
  // it('has no action for create new wallet button', () => {
  //   renderScreen(
  //     () => <MultichainAddWalletActions {...mockProps} />,
  //     {
  //       name: 'MultichainAddWalletActions',
  //     },
  //     {
  //       state: mockInitialState,
  //     },
  //   );

  //   const createButton = screen.getByTestId(
  //     AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
  //   );

  //   // TODO: Check correct behaviour after implementing the action
  //   fireEvent.press(createButton);
  //   expect(addNewHdAccount).not.toHaveBeenCalled();
  //   });

  it('navigates to import account screen when clicking import account', () => {
    renderScreen(
      () => <MultichainAddWalletActions {...mockProps} />,
      {
        name: 'MultichainAddWalletActions',
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
      () => <MultichainAddWalletActions {...mockProps} />,
      {
        name: 'MultichainAddWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    const hardwareButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.ADD_HARDWARE_WALLET_BUTTON,
    );
    fireEvent.press(hardwareButton);

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT);
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it('navigates to import SRP when clicking import wallet', () => {
    renderScreen(
      () => <MultichainAddWalletActions {...mockProps} />,
      {
        name: 'MultichainAddWalletActions',
      },
      {
        state: mockInitialState,
      },
    );

    const importWalletButton = screen.getByTestId(
      AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
    );
    fireEvent.press(importWalletButton);

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.MULTI_SRP.IMPORT);
    expect(mockProps.onBack).toHaveBeenCalled();
  });
});
