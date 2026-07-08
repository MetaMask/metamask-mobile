import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GeneralSettings, {
  GENERAL_SETTINGS_CURRENCY_SELECTOR,
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
import { analytics } from '../../../../util/analytics/analytics';

const mockSetCurrentCurrency = jest.fn();
const mockSetSelectedCurrency = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      setCurrentCurrency: (...args: unknown[]) =>
        mockSetCurrentCurrency(...args),
    },
    AssetsController: {
      setSelectedCurrency: (...args: unknown[]) =>
        mockSetSelectedCurrency(...args),
    },
  },
}));

jest.mock('../../../../core/Analytics');

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ name: 'CURRENCY_CHANGED' });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});

jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: (...args: unknown[]) => mockCreateEventBuilder(...args),
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
      }: {
        children?: React.ReactNode;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
        onOpenBottomSheet: jest.fn(),
      }));

      return ReactActual.createElement(
        View,
        { testID: 'mock-bottom-sheet' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'mock-bottom-sheet-backdrop',
          onPress: onClose,
        }),
      );
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'mock-bottom-sheet-header' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'mock-bottom-sheet-close',
          onPress: onClose,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../util/theme/themeUtils', () => ({
  ...jest.requireActual('../../../../util/theme/themeUtils'),
  useElevatedSurface: () => 'bg-default',
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
    const { getByText } = renderComponent();
    expect(getByText('General')).toBeOnTheScreen();
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

describe('GeneralSettings currency selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates both CurrencyRateController and AssetsController when a currency is selected', () => {
    const { getByTestId, getByText } = renderComponent();

    fireEvent.press(getByTestId(GENERAL_SETTINGS_CURRENCY_SELECTOR));
    fireEvent.press(getByText('EUR - Euro'));

    expect(mockSetCurrentCurrency).toHaveBeenCalledWith('eur');
    expect(mockSetSelectedCurrency).toHaveBeenCalledWith('eur');
  });
});

describe('updateUserTraitsWithCurrentCurrency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds selected currency trait', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency);

    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
    });
  });

  it('tracks currency changed event', () => {
    const mockCurrency = 'USD';

    updateUserTraitsWithCurrentCurrency(mockCurrency);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CURRENCY_CHANGED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      [UserProfileProperty.CURRENT_CURRENCY]: mockCurrency,
      location: 'app_settings',
    });
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuild());
  });

  it('does not throw errors when a valid currency is passed', () => {
    const mockCurrency = 'USD';

    expect(() => {
      updateUserTraitsWithCurrentCurrency(mockCurrency);
    }).not.toThrow();
  });
});

describe('updateUserTraitsWithCurrencyType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the primary currency preference', () => {
    const primaryCurrency = 'fiat';

    updateUserTraitsWithCurrencyType(primaryCurrency);

    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency,
    });
  });

  it('does not throw errors', () => {
    const primaryCurrency = 'fiat';

    expect(() => {
      updateUserTraitsWithCurrencyType(primaryCurrency);
    }).not.toThrow();
  });
});
