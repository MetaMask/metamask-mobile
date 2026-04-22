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
    getParent: jest.fn(() => ({
      pop: jest.fn(),
    })),
  };
  const mockThemeColors = {
    background: {
      default: mockTheme.colors.background.default,
    },
    primary: {
      default: mockTheme.colors.primary.default,
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
        mockTheme.colors,
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
    // In React 19, fireEvent.press can't be used on unrendered React elements
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
    // In React 19, fireEvent.press can't be used on unrendered React elements
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
    getParent: jest.fn(() => ({
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

  it('does not track event when quote is selected', () => {
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
        selectedQuote: { id: 'quote-1' },
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

    expect(AnalyticsEventBuilder.createEventBuilder).not.toHaveBeenCalled();
    expect(mockNavigation.pop).toHaveBeenCalled();
  });

  it('renders Android back button correctly', () => {
    const route = {
      params: {
        title: 'Swap',
      },
    };

    Device.isAndroid.mockReturnValue(true);
    const options = getSwapsQuotesNavbar(
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const headerLeft = options.headerLeft();
    expect(headerLeft.type).toBe(require('react-native').TouchableOpacity);
  });
});

describe('getApproveNavbar', () => {
  const { getApproveNavbar } = require('.');

  it('returns navbar options with title and empty left/right components', () => {
    const options = getApproveNavbar('Approve');

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();

    const HeaderLeft = options.headerLeft();
    const HeaderRight = options.headerRight();
    expect(HeaderLeft.type).toBe(View);
    expect(HeaderRight.type).toBe(View);
  });
});

describe('getModalNavbarOptions', () => {
  const { getModalNavbarOptions } = require('.');

  it('returns navbar options with modal title', () => {
    const options = getModalNavbarOptions('Modal Title');

    expect(options.headerTitle).toBeDefined();
  });
});

describe('getOfflineModalNavbar', () => {
  const { getOfflineModalNavbar } = require('.');

  it('returns navbar options with header hidden', () => {
    const options = getOfflineModalNavbar();

    expect(options.headerShown).toBe(false);
  });
});

describe('getOptinMetricsNavbarOptions', () => {
  const { getOptinMetricsNavbarOptions } = require('.');

  it('returns navbar options with logo when showLogo is true', () => {
    const options = getOptinMetricsNavbarOptions(mockTheme.colors, true);

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();
  });

  it('returns navbar options without logo when showLogo is false', () => {
    const options = getOptinMetricsNavbarOptions(mockTheme.colors, false);

    const HeaderTitle = options.headerTitle();
    expect(HeaderTitle).toBeNull();
  });
});

describe('getTransparentBackOnboardingNavbarOptions', () => {
  const { getTransparentBackOnboardingNavbarOptions } = require('.');

  it('returns navbar options with back button', () => {
    const options = getTransparentBackOnboardingNavbarOptions(mockTheme.colors);

    expect(options.headerTitle).toBeDefined();
    expect(options.headerBackTitle).toBe(strings('navigation.back'));
    expect(options.headerRight).toBeDefined();
  });
});

describe('getEditAccountNameNavBarOptions', () => {
  const { getEditAccountNameNavBarOptions } = require('.');

  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with close button', () => {
    const options = getEditAccountNameNavBarOptions(
      mockGoBack,
      mockTheme.colors,
    );

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeNull();
    expect(options.headerRight).toBeDefined();
  });

  it('calls goBack when close button is pressed', () => {
    const options = getEditAccountNameNavBarOptions(
      mockGoBack,
      mockTheme.colors,
    );

    const HeaderRight = options.headerRight();
    HeaderRight.props.onPress();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

describe('getDeFiProtocolPositionDetailsNavbarOptions', () => {
  const { getDeFiProtocolPositionDetailsNavbarOptions } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with back button', () => {
    const options = getDeFiProtocolPositionDetailsNavbarOptions(mockNavigation);

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();

    const HeaderTitle = options.headerTitle();
    expect(HeaderTitle).toBeNull();
  });

  it('calls navigation.pop when back button is pressed', () => {
    const options = getDeFiProtocolPositionDetailsNavbarOptions(mockNavigation);

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});

describe('getRampsOrderDetailsNavbarOptions', () => {
  const { getRampsOrderDetailsNavbarOptions } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with back button when showBack is true', () => {
    const options = getRampsOrderDetailsNavbarOptions(
      mockNavigation,
      { title: 'Order Details', showBack: true },
      mockTheme,
      mockOnClose,
    );

    expect(options).toBeDefined();
    expect(options.header).toBeInstanceOf(Function);
  });

  it('pops navigation and calls onClose when back is pressed', () => {
    const options = getRampsOrderDetailsNavbarOptions(
      mockNavigation,
      { title: 'Order Details', showBack: true },
      mockTheme,
      mockOnClose,
    );

    const HeaderComponent = options.header();
    HeaderComponent.props.startButtonIconProps.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe('getBridgeTransactionDetailsNavbar', () => {
  const { getBridgeTransactionDetailsNavbar } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with back button', () => {
    const options = getBridgeTransactionDetailsNavbar(mockNavigation);

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
  });

  it('calls navigation.pop when back button is pressed', () => {
    const options = getBridgeTransactionDetailsNavbar(mockNavigation);

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});

describe('getEditableOptions', () => {
  const { getEditableOptions } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with title and back button', () => {
    const route = { params: { editMode: 'edit', dispatch: jest.fn() } };
    const options = getEditableOptions(
      'Edit Contact',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    expect(options.title).toBe('Edit Contact');
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();
  });

  it('shows edit button when in view mode', () => {
    const mockDispatch = jest.fn();
    const route = { params: { editMode: 'view', dispatch: mockDispatch } };
    const options = getEditableOptions(
      'View Contact',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderRight = options.headerRight();
    expect(HeaderRight).toBeDefined();
  });

  it('shows empty view when in add mode', () => {
    const route = { params: { mode: 'add', dispatch: jest.fn() } };
    const options = getEditableOptions(
      'Add Contact',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderRight = options.headerRight();
    expect(HeaderRight.type).toBe(View);
  });

  it('calls navigation.pop on back button press', () => {
    const route = { params: { editMode: 'edit' } };
    const options = getEditableOptions(
      'Edit Contact',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});

describe('getClosableNavigationOptions', () => {
  const { getClosableNavigationOptions } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Device.isIos.mockReset();
  });

  it('returns navbar options with title', () => {
    Device.isIos.mockReturnValue(true);
    const options = getClosableNavigationOptions(
      'Test Title',
      'Back',
      mockNavigation,
      mockTheme.colors,
    );

    expect(options.title).toBe('Test Title');
    expect(options.headerLeft).toBeDefined();
  });

  it('shows text button on iOS', () => {
    Device.isIos.mockReturnValue(true);
    const options = getClosableNavigationOptions(
      'Test Title',
      'Back',
      mockNavigation,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });

  it('shows icon button on Android', () => {
    Device.isIos.mockReturnValue(false);
    Device.isAndroid.mockReturnValue(true);
    const options = getClosableNavigationOptions(
      'Test Title',
      'Back',
      mockNavigation,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});

describe('getImportTokenNavbarOptions', () => {
  const { getImportTokenNavbarOptions } = require('.');

  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with header function', () => {
    const options = getImportTokenNavbarOptions(mockNavigation, 'Import Token');

    expect(options.header).toBeDefined();
    expect(typeof options.header).toBe('function');
  });

  it('calls custom onPress when provided', () => {
    const customOnPress = jest.fn();
    const options = getImportTokenNavbarOptions(
      mockNavigation,
      'Import Token',
      customOnPress,
    );

    expect(options.header).toBeDefined();
  });
});

describe('getNftDetailsNavbarOptions', () => {
  const { getNftDetailsNavbarOptions } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with back button', () => {
    const options = getNftDetailsNavbarOptions(
      mockNavigation,
      mockTheme.colors,
    );

    expect(options.headerLeft).toBeDefined();
    expect(options.headerStyle).toBeDefined();
  });

  it('calls navigation.pop when back button is pressed', () => {
    const options = getNftDetailsNavbarOptions(
      mockNavigation,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });

  it('shows more options button when onRightPress is provided', () => {
    const mockOnRightPress = jest.fn();
    const options = getNftDetailsNavbarOptions(
      mockNavigation,
      mockTheme.colors,
      mockOnRightPress,
    );

    const HeaderRight = options.headerRight();
    HeaderRight.props.onPress();

    expect(mockOnRightPress).toHaveBeenCalledTimes(1);
  });

  it('shows empty view when onRightPress is not provided', () => {
    const options = getNftDetailsNavbarOptions(
      mockNavigation,
      mockTheme.colors,
    );

    const HeaderRight = options.headerRight();
    expect(HeaderRight.type).toBe(View);
  });

  it('applies shadow styles based on contentOffset', () => {
    const options = getNftDetailsNavbarOptions(
      mockNavigation,
      mockTheme.colors,
      undefined,
      25,
    );

    expect(options.headerStyle).toBeDefined();
  });
});

describe('getNftFullImageNavbarOptions', () => {
  const { getNftFullImageNavbarOptions } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with close button on right', () => {
    const options = getNftFullImageNavbarOptions(
      mockNavigation,
      mockTheme.colors,
    );

    expect(options.headerRight).toBeDefined();
    expect(options.headerLeft).toBeDefined();
  });

  it('calls navigation.pop when close button is pressed', () => {
    const options = getNftFullImageNavbarOptions(
      mockNavigation,
      mockTheme.colors,
    );

    const HeaderRight = options.headerRight();
    HeaderRight.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });

  it('shows empty view on left', () => {
    const options = getNftFullImageNavbarOptions(
      mockNavigation,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    expect(HeaderLeft.type).toBe(View);
  });
});

describe('getSwapsAmountNavbar', () => {
  const { getSwapsAmountNavbar } = require('.');

  const mockNavigation = {
    getParent: jest.fn(() => ({
      pop: jest.fn(),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with title and cancel button', () => {
    const route = { params: { title: 'Swap' } };
    const options = getSwapsAmountNavbar(
      mockNavigation,
      route,
      mockTheme.colors,
    );

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();
  });

  it('uses default title when not provided', () => {
    const route = { params: {} };
    const options = getSwapsAmountNavbar(
      mockNavigation,
      route,
      mockTheme.colors,
    );

    expect(options.headerTitle).toBeDefined();
  });

  it('shows empty view on left', () => {
    const route = { params: {} };
    const options = getSwapsAmountNavbar(
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    expect(HeaderLeft.type).toBe(View);
  });
});

describe('getPerpsTransactionsDetailsNavbar', () => {
  const { getPerpsTransactionsDetailsNavbar } = require('.');

  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with title and back button', () => {
    const options = getPerpsTransactionsDetailsNavbar(
      mockNavigation,
      'Position Details',
    );

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const options = getPerpsTransactionsDetailsNavbar(
      mockNavigation,
      'Position Details',
    );

    const HeaderLeft = options.headerLeft();
    HeaderLeft.props.onPress();

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('getTransactionOptionsTitle', () => {
  const { getTransactionOptionsTitle } = require('.');

  const mockNavigation = {
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with title', () => {
    const route = {
      name: 'Send',
      params: { mode: '', disableModeChange: false, dispatch: jest.fn() },
    };
    const options = getTransactionOptionsTitle(
      'transaction.title',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    expect(options.headerTitle).toBeDefined();
    expect(options.headerLeft).toBeDefined();
    expect(options.headerRight).toBeDefined();
  });

  it('shows edit button when not in edit mode', () => {
    const mockDispatch = jest.fn();
    const route = {
      name: 'Confirm',
      params: { mode: '', disableModeChange: false, dispatch: mockDispatch },
    };
    const options = getTransactionOptionsTitle(
      'transaction.title',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    expect(HeaderLeft).toBeDefined();
  });

  it('shows empty view on left when in edit mode', () => {
    const route = {
      name: 'Confirm',
      params: { mode: 'edit', disableModeChange: false },
    };
    const options = getTransactionOptionsTitle(
      'transaction.title',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderLeft = options.headerLeft();
    expect(HeaderLeft.type).toBe(View);
  });

  it('shows cancel button on right for Send screen', () => {
    const route = {
      name: 'Send',
      params: { mode: '' },
    };
    const options = getTransactionOptionsTitle(
      'transaction.title',
      mockNavigation,
      route,
      mockTheme.colors,
    );

    const HeaderRight = options.headerRight();
    HeaderRight.props.onPress();

    expect(mockNavigation.pop).toHaveBeenCalledTimes(1);
  });
});
