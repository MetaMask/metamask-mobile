import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../components/Views/AddAccountActions/AddAccountBottomSheet.testIds';
import MultichainAddWalletActions from './MultichainAddWalletActions';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { MOCK_KEYRING_CONTROLLER } from '../../../../selectors/keyringController/testUtils';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';

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
const mockCreateEventBuilder = jest.fn((event) => ({
  build: jest.fn(() => event),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
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

  describe('Analytics', () => {
    it('tracks event when import wallet button is pressed', () => {
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

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
      );
    });

    it('tracks event when import account button is pressed', () => {
      renderScreen(
        () => <MultichainAddWalletActions {...mockProps} />,
        {
          name: 'MultichainAddWalletActions',
        },
        {
          state: mockInitialState,
        },
      );

      const importAccountButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
      );
      fireEvent.press(importAccountButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      );
    });

    it('tracks event when hardware wallet button is pressed', () => {
      renderScreen(
        () => <MultichainAddWalletActions {...mockProps} />,
        {
          name: 'MultichainAddWalletActions',
        },
        {
          state: mockInitialState,
        },
      );

      const hardwareWalletButton = screen.getByTestId(
        AddAccountBottomSheetSelectorsIDs.ADD_HARDWARE_WALLET_BUTTON,
      );
      fireEvent.press(hardwareWalletButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ADD_HARDWARE_WALLET,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.ADD_HARDWARE_WALLET,
      );
    });
  });
});
