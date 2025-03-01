import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import OptIn from '.';
import { RootState } from '../../../../reducers';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import/no-namespace
import * as OptInHooksModule from './OptIn.hooks';
// eslint-disable-next-line import/no-namespace
import * as UseNotificationsModule from '../../../../util/notifications/hooks/useNotifications';

const mockedDispatch = jest.fn();

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        metamaskNotificationsList: [],
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((selector) => selector(mockInitialState)),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: mockedDispatch,
    }),
  };
});

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

const arrangeMockOptInHooks = () => {
  const mockCancel = jest.fn();
  const mockUseHandleOptInCancel = jest
    .spyOn(OptInHooksModule, 'useHandleOptInCancel')
    .mockReturnValue(mockCancel);

  const mockClick = jest.fn();
  const mockUseHadleOptInClick = jest
    .spyOn(OptInHooksModule, 'useHandleOptInClick')
    .mockReturnValue(mockClick);

  const mockUseOptimisticNavigationEffect = jest
    .spyOn(OptInHooksModule, 'useOptimisticNavigationEffect')
    .mockReturnValue(false);

  const mockUseEnableNotificationReturnVal = {
    data: false,
    enableNotifications: jest.fn(),
    error: null,
    isEnablingNotifications: false,
    isEnablingPushNotifications: false,
    loading: false,
  };
  const mockUseEnableNotifications = jest
    .spyOn(UseNotificationsModule, 'useEnableNotifications')
    .mockReturnValue(mockUseEnableNotificationReturnVal);

  return {
    mockCancel,
    mockUseHandleOptInCancel,
    mockClick,
    mockUseHadleOptInClick,
    mockUseOptimisticNavigationEffect,
    mockUseEnableNotifications,
    mockUseEnableNotificationReturnVal,
  };
};

describe('OptIn', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    arrangeMockOptInHooks();
    const { toJSON } = renderWithProvider(<OptIn />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls enableNotifications when the button is pressed', async () => {
    const mocks = arrangeMockOptInHooks();
    const { getByText } = renderWithProvider(<OptIn />);

    const button = getByText(strings('notifications.activation_card.cta'));
    expect(button).toBeDefined();
    act(() => fireEvent.press(button));

    expect(mocks.mockClick).toHaveBeenCalled();
  });

  it('calls navigate when the cancel button is pressed', async () => {
    const mocks = arrangeMockOptInHooks();
    const { getByText } = renderWithProvider(<OptIn />);

    const button = getByText(strings('notifications.activation_card.cancel'));
    expect(button).toBeDefined();
    act(() => fireEvent.press(button));

    expect(mocks.mockCancel).toHaveBeenCalled();
  });

  it('shows loading modal while enabling notifications', async () => {
    const mocks = arrangeMockOptInHooks();
    mocks.mockUseEnableNotifications.mockReturnValue({
      ...mocks.mockUseEnableNotificationReturnVal,
      isEnablingNotifications: true,
      loading: true,
    });
    renderWithProvider(<OptIn />);

    const loader = screen.getByText(
      strings('app_settings.enabling_notifications'),
    );
    expect(loader).toBeDefined();
  });
});
