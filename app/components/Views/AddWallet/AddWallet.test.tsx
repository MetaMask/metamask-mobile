import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { renderScreen } from '../../../util/test/renderWithProvider';
import AddWallet from './AddWallet';
import { AddWalletTestIds } from './AddWallet.testIds';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedDispatch = jest.fn();

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

jest.mock('../../../selectors/featureFlagController/addDeviceSync', () => ({
  selectAddDeviceSyncEnabled: () => true,
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactActual.forwardRef(
        (
          { children, testID }: { children: React.ReactNode; testID?: string },
          ref: React.Ref<{
            onOpenBottomSheet: () => void;
            onCloseBottomSheet: (callback?: () => void) => void;
          }>,
        ) => {
          ReactActual.useImperativeHandle(ref, () => ({
            onOpenBottomSheet: jest.fn(),
            onCloseBottomSheet: (callback?: () => void) => callback?.(),
          }));
          return <View testID={testID}>{children}</View>;
        },
      ),
    };
  },
);

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('AddWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
      dispatch: mockedDispatch,
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
      screen.getByText(strings('account_actions.create_new_wallet')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('multichain_accounts.create_wallet_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('account_actions.import_wallet')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('multichain_accounts.import_wallet_description'),
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

  it('opens the import wallet options', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    expect(
      screen.queryByTestId(AddWalletTestIds.IMPORT_OPTIONS_SHEET),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(AddWalletTestIds.IMPORT_WALLET_BUTTON));

    expect(
      screen.getByTestId(AddWalletTestIds.IMPORT_OPTIONS_SHEET),
    ).toBeOnTheScreen();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('opens the Secret Recovery Phrase import flow from import options', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.IMPORT_WALLET_BUTTON));
    fireEvent.press(
      screen.getByTestId(AddWalletTestIds.IMPORT_FROM_SRP_BUTTON),
    );

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.MULTI_SRP.IMPORT);
    expect(mockedGoBack).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
    );
  });

  it('opens the extension sync flow from import options', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.IMPORT_WALLET_BUTTON));
    fireEvent.press(
      screen.getByTestId(AddWalletTestIds.IMPORT_FROM_EXTENSION_BUTTON),
    );

    expect(mockedNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
    );
  });

  it('keeps create wallet as a no-op for the prototype', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.CREATE_WALLET_BUTTON));

    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(mockedDispatch).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('opens the import account flow', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(screen.getByTestId(AddWalletTestIds.IMPORT_ACCOUNT_BUTTON));

    expect(mockedNavigate).toHaveBeenCalledWith(Routes.IMPORT_PRIVATE_KEY_VIEW);
    expect(mockedGoBack).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
    );
  });

  it('opens the hardware wallet flow and dismisses AddWallet', () => {
    renderScreen(() => <AddWallet />, {
      name: 'AddWallet',
    });

    fireEvent.press(
      screen.getByTestId(AddWalletTestIds.CONNECT_HARDWARE_BUTTON),
    );

    // AddWallet is replaced by the HW flow so that pop(2) in the HW screens
    // lands on AccountSelector instead of back on this screen.
    expect(mockedDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.HW.CONNECT),
    );
    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(mockedGoBack).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ADD_HARDWARE_WALLET,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.ADD_HARDWARE_WALLET,
    );
  });
});
