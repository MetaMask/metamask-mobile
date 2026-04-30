import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { renderScreen } from '../../../util/test/renderWithProvider';
import AddWallet from './AddWallet';
import { AddWalletTestIds } from './AddWallet.testIds';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((event) => ({
  build: jest.fn(() => event),
}));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('AddWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('renders the add wallet options from the design', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    expect(screen.getByTestId(AddWalletTestIds.SCREEN)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('multichain_accounts.add_wallet')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('account_actions.import_wallet')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('multichain_accounts.add_wallet_srp_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('accounts.import_account')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('multichain_accounts.add_wallet_private_key_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('connect_hardware.title_select_hardware')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('multichain_accounts.add_wallet_hardware_description'),
      ),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.BACK_BUTTON));

    expect(mockedGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the import wallet flow', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.IMPORT_WALLET_BUTTON));

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.MULTI_SRP.IMPORT);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
    );
  });

  it('opens the import account flow', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.IMPORT_ACCOUNT_BUTTON));

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.IMPORT_PRIVATE_KEY_VIEW);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
    );
  });

  it('opens the hardware wallet flow', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(
      screen.getByTestId(AddWalletTestIds.CONNECT_HARDWARE_BUTTON),
    );

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ADD_HARDWARE_WALLET,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.ADD_HARDWARE_WALLET,
    );
  });
});
