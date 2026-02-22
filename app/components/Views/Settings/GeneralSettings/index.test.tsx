import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GeneralSettings, {
  updateUserTraitsWithCurrentCurrency,
  updateUserTraitsWithCurrencyType,
} from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { AppThemeKey } from '../../../../util/theme/models';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { ThemeContext, mockTheme } from '../../../../util/theme';

jest.mock('../../../../core/Analytics');
jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: jest.fn().mockReturnValue(true),
    enable: jest.fn(),
    addTraitsToUser: jest.fn(),
    createEventBuilder: jest.fn(),
    trackEvent: jest.fn(),
    trackAnonymousEvent: jest.fn(),
    getMetaMetricsId: jest.fn(),
  }),
  withMetricsAwareness:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Component: React.ComponentType<any>) =>
      (props: Record<string, unknown>) => <Component {...props} metrics={{}} />,
}));
jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => ({
    __esModule: true,
    default: () => null,
    AvatarAccountType: {
      JazzIcon: 'JazzIcon',
      Blockies: 'Blockies',
      Maskicon: 'Maskicon',
    },
  }),
);

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'Google',
    avatarAccountType: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState,
  },
  user: { appTheme: AppThemeKey.light },
};
const store = mockStore(initialState);

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const renderComponent = () =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <GeneralSettings navigation={mockNavigation} />
      </ThemeContext.Provider>
    </Provider>,
  );

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders header with correct title', () => {
    const { getByText } = renderComponent();
    expect(getByText('General')).toBeTruthy();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = renderComponent();
    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });
});

const mockMetrics = {
  addTraitsToUser: jest.fn(),
  trackEvent: jest.fn(),
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
};

describe('updateUserTraitsWithCurrentCurrency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds selected currency trait', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);

    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
    });
  });

  it('tracks currency changed event', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);

    // Check if trackEvent was called with the correct event and properties
    expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.CURRENCY_CHANGED)
        .addProperties({
          [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
          location: 'app_settings',
        })
        .build(),
    );
  });

  it('does not throw errors when a valid currency is passed', () => {
    const mockCurrency = 'USD';

    expect(() => {
      updateUserTraitsWithCurrentCurrency(mockCurrency, mockMetrics);
    }).not.toThrow();
  });
});

describe('updateUserTraitsWithCurrencyType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the primary currency preference', () => {
    const primaryCurrency = 'fiat';

    updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);

    expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
    });
  });

  it('does not throw errors if metrics object is properly passed', () => {
    const primaryCurrency = 'fiat';

    expect(() => {
      updateUserTraitsWithCurrencyType(primaryCurrency, mockMetrics);
    }).not.toThrow();
  });
});
