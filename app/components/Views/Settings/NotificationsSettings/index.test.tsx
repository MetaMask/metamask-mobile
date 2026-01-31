import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';
import { Props } from './NotificationsSettings.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('../../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn().mockReturnValue(true),
}));

const mockInitialState = {
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NotificationServicesController: {
        isNotificationServicesEnabled: false,
        isUpdatingMetamaskNotifications: false,
        isUpdatingMetamaskNotificationsAccount: [],
        metamaskNotificationsList: [],
      },
    },
  },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    getAllPermissions: jest.fn(),
  }),
);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const setOptions = jest.fn();

const createMockNavigation = () => ({
  setOptions,
  navigate: mockNavigate,
  goBack: mockGoBack,
});

describe('NotificationsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsSettings
        navigation={createMockNavigation() as unknown as Props['navigation']}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to wallet home when back pressed and notifications disabled', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationsSettings
        navigation={createMockNavigation() as unknown as Props['navigation']}
      />,
      {
        state: mockInitialState,
      },
    );

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('calls goBack when back pressed and notifications enabled', () => {
    const stateWithNotificationsEnabled = {
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          NotificationServicesController: {
            ...mockInitialState.engine.backgroundState
              .NotificationServicesController,
            isNotificationServicesEnabled: true,
          },
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <NotificationsSettings
        navigation={createMockNavigation() as unknown as Props['navigation']}
      />,
      {
        state: stateWithNotificationsEnabled,
      },
    );

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
