import React from 'react';
import OptIn from '.';
import { RootState } from '../../../../reducers';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';

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
    useSelector: jest.fn().mockImplementation((selector) => selector(mockInitialState)),
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

jest.mock('../../../../actions/notification/helpers', () => ({
  enableNotificationServices: jest.fn(),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
  }),
}));

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: () => ({
    enableNotifications: jest.fn(),
  }),
}));

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock('../../../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: jest.fn(),
}));

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    NOTIFICATIONS_ACTIVATED: 'notifications_activated',
  },
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../selectors/notifications', () => ({
  selectIsProfileSyncingEnabled: jest.fn(),
}));

describe('OptIn', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<OptIn />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls enableNotifications when the button is pressed', async () => {
    const { getByText } = renderWithProvider(
        <OptIn />
    );

    const button = getByText(strings('notifications.activation_card.cta'));
    expect(button).toBeDefined();
  });

  it('calls navigate when the cancel button is pressed', async () => {
    const { getByText } = renderWithProvider(
        <OptIn />
    );

    const button = getByText(strings('notifications.activation_card.cancel'));
    expect(button).toBeDefined();
  });

  it('calls trackEvent when the button is pressed', async () => {
    const { getByText } = renderWithProvider(
        <OptIn />
    );

    const button = getByText(strings('notifications.activation_card.cta'));
    expect(button).toBeDefined();
  });
});

