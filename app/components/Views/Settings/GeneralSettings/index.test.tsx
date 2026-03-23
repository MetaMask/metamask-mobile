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
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';

jest.mock('../../../../core/Analytics');

jest.mock('../../../../components/hooks/useAnalytics/useAnalytics');

const mockWithAnalyticsCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  addSensitiveProperties: jest.fn().mockReturnThis(),
  removeProperties: jest.fn().mockReturnThis(),
  removeSensitiveProperties: jest.fn().mockReturnThis(),
  setSaveDataRecording: jest.fn().mockReturnThis(),
  build: jest.fn(),
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
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        createEventBuilder: mockWithAnalyticsCreateEventBuilder,
      }),
    );
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

const mockUpdateAddProperties = jest.fn().mockReturnThis();
const mockUpdateBuild = jest.fn().mockReturnValue({ name: 'CURRENCY_CHANGED' });
const mockUpdateCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockUpdateAddProperties,
  build: mockUpdateBuild,
});

const mockAnalytics = {
  identify: jest.fn(),
  trackEvent: jest.fn(),
  createEventBuilder: mockUpdateCreateEventBuilder,
};

describe('updateUserTraitsWithCurrentCurrency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds selected currency trait', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockAnalytics);

    expect(mockAnalytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
    });
  });

  it('tracks currency changed event', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency, mockAnalytics);

    expect(mockUpdateCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CURRENCY_CHANGED,
    );
    expect(mockUpdateAddProperties).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
      location: 'app_settings',
    });
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(mockUpdateBuild());
  });

  it('does not throw errors when a valid currency is passed', () => {
    const mockCurrency = 'USD';

    expect(() => {
      updateUserTraitsWithCurrentCurrency(mockCurrency, mockAnalytics);
    }).not.toThrow();
  });
});

describe('updateUserTraitsWithCurrencyType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the primary currency preference', () => {
    const primaryCurrency = 'fiat';

    updateUserTraitsWithCurrencyType(primaryCurrency, mockAnalytics);

    expect(mockAnalytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
    });
  });

  it('does not throw errors if analytics object is properly passed', () => {
    const primaryCurrency = 'fiat';

    expect(() => {
      updateUserTraitsWithCurrencyType(primaryCurrency, mockAnalytics);
    }).not.toThrow();
  });
});
