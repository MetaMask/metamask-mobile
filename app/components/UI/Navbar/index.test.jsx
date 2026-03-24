/* eslint-disable react/prop-types */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  getDepositNavbarOptions,
  getNetworkNavbarOptions,
  getNavigationOptionsTitle,
  getOnboardingNavbarOptions,
  getTransparentOnboardingNavbarOptions,
  getStakingNavbar,
  getSwapsQuotesNavbar,
} from '.';
import { mockTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { View } from 'react-native';
import { BridgeViewMode } from '../Bridge/types';
import { strings } from '../../../../locales/i18n';
import {
  AnalyticsEventBuilder,
  chainableBuilder,
} from '../../../util/analytics/AnalyticsEventBuilder';

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(),
  isIphoneX: jest.fn(),
  isIphone5S: jest.fn(),
  isIos: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            'account-1': {
              address: '0x1234567890123456789012345678901234567890',
              id: 'account-1',
              metadata: {
                name: 'Test Account',
                keyring: { type: 'HD Key Tree' },
              },
            },
          },
        },
      },
    },
  },
}));

jest.mock('../../../util/address', () => ({
  getLabelTextByAddress: jest.fn(() => null),
  getInternalAccountByAddress: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    id: 'account-1',
    metadata: {
      name: 'Test Account',
      keyring: { type: 'HD Key Tree' },
    },
  })),
  areAddressesEqual: jest.fn(() => true),
}));

jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => false),
  NotificationTypes: {
    TRANSACTION: 'transaction',
    SIMPLE: 'simple',
  },
}));

jest.mock('../../../util/networks', () => ({
  getNetworkNameFromProviderConfig: jest.fn(() => 'Ethereum Mainnet'),
}));

jest.mock('../../../util/analytics/AnalyticsEventBuilder', () => {
  const chainableBuilder = {
    addProperties: jest.fn(function () {
      return this;
    }),
    addSensitiveProperties: jest.fn(function () {
      return this;
    }),
    removeProperties: jest.fn(function () {
      return this;
    }),
    removeSensitiveProperties: jest.fn(function () {
      return this;
    }),
    setSaveDataRecording: jest.fn(function () {
      return this;
    }),
    build: jest.fn(() => ({ builtEvent: true })),
  };
  const createEventBuilder = jest.fn(() => chainableBuilder);
  return {
    __esModule: true,
    default: { createEventBuilder },
    AnalyticsEventBuilder: { createEventBuilder },
    chainableBuilder,
  };
});

const mockAnalyticsTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args) => mockAnalyticsTrackEvent(...args),
  },
}));

jest.mock('../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    SEND_FLOW_CANCEL: 'SEND_FLOW_CANCEL',
    WALLET_QR_SCANNER: 'WALLET_QR_SCANNER',
    NOTIFICATIONS_MENU_OPENED: 'NOTIFICATIONS_MENU_OPENED',
    NOTIFICATIONS_ACTIVATED: 'NOTIFICATIONS_ACTIVATED',
    NAVIGATION_TAPS_SETTINGS: 'NAVIGATION_TAPS_SETTINGS',
    CARD_HOME_CLICKED: 'CARD_HOME_CLICKED',
    QUOTES_REQUEST_CANCELLED: 'QUOTES_REQUEST_CANCELLED',
  },
}));

jest.mock('../../../util/blockaid', () => ({
  getBlockaidTransactionMetricsParams: jest.fn(() => ({})),
}));

jest.mock('../Stake/utils/metaMetrics/withMetaMetrics', () => ({
  withMetaMetrics: jest.fn((fn) => () => fn()),
}));

jest.mock('../AddressCopy', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => <View testID="address-copy-mock" />,
  };
});

describe('getNetworkNavbarOptions', () => {
  const Stack = createStackNavigator();

  const mockNavigation = {
    pop: jest.fn(),
  };

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen
        name="TestScreen"
        component={() => null}
        options={options}
      />
    </Stack.Navigator>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    Device.isAndroid.mockReset();
  });

  it('renders correctly with default options', () => {
    const options = getNetworkNavbarOptions(
      'Test Title',
      false,
      mockNavigation,
      mockTheme.colors,
    );

    const { getByText } = renderWithProvider(
      <TestNavigator options={options} />,
      {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
            },
          },
        },
      },
    );

    expect(getByText('Test Title')).toBeTruthy();
  });
});

describe('getDepositNavbarOptions', () => {
  const mockNavigation = {
    pop: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with header function', () => {
    const options = getDepositNavbarOptions(
      mockNavigation,
      { title: 'Deposit' },
      mockTheme,
    );

    expect(options).toBeDefined();
    expect(options.header).toBeInstanceOf(Function);
  });

  it('pops navigation when back button is pressed', () => {
    const options = getDepositNavbarOptions(
      mockNavigation,
      { title: 'Deposit' },
      mockTheme,
    );
    const HeaderComponent = options.header();
    HeaderComponent.props.startButtonIconProps.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});

describe('getTransparentOnboardingNavbarOptions', () => {
  const mockNavigation = {
    pop: jest.fn(),
    goBack: jest.fn(),
  };

  it('render transparent onboarding navbar options', () => {
    const options = getTransparentOnboardingNavbarOptions(
      mockTheme,
      'red',
      true,
      'blue',
    );
    expect(options).toBeDefined();
  });

  it('render transparent onboarding navbar options with custom background color', () => {
    const options = getTransparentOnboardingNavbarOptions(
      mockTheme,
      'red',
      true,
      'blue',
    );
    expect(options.headerStyle.backgroundColor).toBe('red');
  });

  it('handles getOnboardingNavbarOptions', () => {
    const options = getOnboardingNavbarOptions(
      mockNavigation,
      { headerLeft: () => <View />, headerRight: () => <View /> },
      mockTheme.colors,
      true,
    );
    expect(options).toBeDefined();
  });
});

describe('getOnboardingNavbarOptions', () => {
  const mockNavigation = {
    pop: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render onboarding navbar options with default props', () => {
    const options = getOnboardingNavbarOptions(
      mockNavigation,
      { headerLeft: () => <View />, headerRight: () => <View /> },
      mockTheme.colors,
      true,
    );
    expect(options).toBeDefined();
  });
});

describe('getBridgeNavbar', () => {
  const mockNavigation = {
    dangerouslyGetParent: jest.fn(() => ({
      pop: jest.fn(),
    })),
  };
  const mockThemeColors = {
    background: {
      default: '#FFFFFF',
    },
    primary: {
      default: '#037DD6',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Device.isAndroid.mockReset();
  });

  describe('returns header options', () => {
    it('returns a header function', () => {
      const { getBridgeNavbar } = require('.');
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Swap,
        mockThemeColors,
      );

      expect(options.header).toBeDefined();
      expect(typeof options.header).toBe('function');
    });
  });
});

describe('getStakingNavbar', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };
  const {
    withMetaMetrics,
  } = require('../Stake/utils/metaMetrics/withMetaMetrics');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders balance and APR when earnToken is provided', () => {
    const mockNavigation = { goBack: jest.fn() };
    const earnToken = {
      balanceFormatted: '1,234.56 USDC',
      experience: { apr: '5.234' },
    };

    const options = getStakingNavbar(
      'Stake',
      mockNavigation,
      mockTheme.colors,
      { hasBackButton: false, hasCancelButton: false },
      undefined,
      earnToken,
    );

    const HeaderTitle = options.headerTitle;
    const { getByText } = renderWithProvider(<HeaderTitle />, {
      state: { engine: { backgroundState } },
    });

    expect(getByText(earnToken.balanceFormatted)).toBeTruthy();

    const expectedApr = `${parseFloat(earnToken.experience.apr).toFixed(
      1,
    )}% ${strings('earn.apr')}`;
    expect(getByText(expectedApr)).toBeTruthy();
  });

  it('invokes goBack on back button press and records metrics when provided', () => {
    const options = getStakingNavbar(
      'Stake',
      mockNavigation,
      mockTheme.colors,
      { hasBackButton: true },
      {
        backButtonEvent: { event: 'BACK_EVT', properties: { source: 'test' } },
      },
    );

    const headerLeft = options.headerLeft();
    headerLeft.props.onPress();

    expect(withMetaMetrics).toHaveBeenCalledTimes(1);
    expect(withMetaMetrics).toHaveBeenCalledWith(expect.any(Function), {
      event: 'BACK_EVT',
      properties: { source: 'test' },
    });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('invokes icon handler and records metrics when icon button is pressed', () => {
    const handleIconPress = jest.fn();

    const options = getStakingNavbar(
      'Stake',
      mockNavigation,
      mockTheme.colors,
      {
        hasBackButton: false,
        hasCancelButton: false,
        hasIconButton: true,
        handleIconPress,
      },
      {
        iconButtonEvent: { event: 'ICON_EVT', properties: { from: 'header' } },
      },
    );

    const headerRight = options.headerRight();
    headerRight.props.onPress();

    expect(withMetaMetrics).toHaveBeenCalledTimes(1);
    expect(withMetaMetrics).toHaveBeenCalledWith(expect.any(Function), {
      event: 'ICON_EVT',
      properties: { from: 'header' },
    });
    expect(handleIconPress).toHaveBeenCalledTimes(1);
  });
});

describe('getNavigationOptionsTitle', () => {
  const Stack = createStackNavigator();

  const mockNavigation = {
    goBack: jest.fn(),
  };

  const renderNavigatorWithOptions = (options) => {
    const TestNavigator = () => (
      <Stack.Navigator>
        <Stack.Screen
          name="TestScreen"
          component={() => null}
          options={options}
        />
      </Stack.Navigator>
    );
    return renderWithProvider(<TestNavigator />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackEvent when navigationPopEvent is provided and close button pressed', () => {
    const mockEvent = { category: 'test' };
    const options = getNavigationOptionsTitle(
      'Test Title',
      mockNavigation,
      true,
      mockTheme.colors,
      mockEvent,
    );

    const { getByTestId } = renderNavigatorWithOptions(options);

    fireEvent.press(getByTestId('close-network-icon'));

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      mockEvent,
    );
    expect(chainableBuilder.build).toHaveBeenCalled();
    expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
  });

  it('does not call trackEvent when navigationPopEvent is null', () => {
    const options = getNavigationOptionsTitle(
      'Test Title',
      mockNavigation,
      false,
      mockTheme.colors,
      null,
    );

    const { getByTestId } = renderNavigatorWithOptions(options);

    fireEvent.press(getByTestId('back-arrow-button'));

    expect(AnalyticsEventBuilder.createEventBuilder).not.toHaveBeenCalled();
    expect(mockAnalyticsTrackEvent).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('getSwapsQuotesNavbar', () => {
  const mockNavigation = {
    pop: jest.fn(),
    dangerouslyGetParent: jest.fn(() => ({
      pop: jest.fn(),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks QUOTES_REQUEST_CANCELLED on left action when no quote is selected', () => {
    const route = {
      params: {
        title: 'Swap',
        requestedTrade: {
          token_from: 'ETH',
          token_to: 'DAI',
          request_type: 'Order',
          custom_slippage: false,
          chain_id: '0x1',
          token_from_amount: '1',
        },
        selectedQuote: null,
        quoteBegin: Date.now() - 1000,
      },
    };

    const options = getSwapsQuotesNavbar(
      mockNavigation,
      route,
      mockTheme.colors,
    );

    Device.isAndroid.mockReturnValue(false);
    const headerLeft = options.headerLeft();
    headerLeft.props.onPress();

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      'QUOTES_REQUEST_CANCELLED',
    );
    expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
    expect(mockNavigation.pop).toHaveBeenCalled();
  });
});
