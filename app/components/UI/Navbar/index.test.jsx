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
  getWalletNavbarOptions,
  getStakingNavbar,
} from '.';
import { mockTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { View } from 'react-native';
import { BridgeViewMode } from '../Bridge/types';
import { strings } from '../../../../locales/i18n';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

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

const mockBuildEvent = jest.fn(() => ({ builtEvent: true }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({
    build: mockBuildEvent,
  })),
  build: mockBuildEvent,
}));

jest.mock('../../../core/Analytics/MetricsEventBuilder');

jest.mock('../../../core/Analytics', () => {
  const actualMockTrackEvent = jest.fn();

  return {
    __mockTrackEvent: actualMockTrackEvent,
    MetaMetrics: {
      getInstance: jest.fn(() => ({
        trackEvent: actualMockTrackEvent,
        updateDataRecordingFlag: jest.fn(),
      })),
      trackEvent: jest.fn(),
    },
    MetaMetricsEvents: {
      SEND_FLOW_CANCEL: 'SEND_FLOW_CANCEL',
    },
    trackEvent: jest.fn(),
  };
});

jest.mock('../../../util/blockaid', () => ({
  getBlockaidTransactionMetricsParams: jest.fn(() => ({})),
}));

jest.mock('../Stake/utils/metaMetrics/withMetaMetrics', () => ({
  withMetaMetrics: jest.fn((fn) => () => fn()),
}));

// Set up MetricsEventBuilder mock after jest.mock declaration
MetricsEventBuilder.createEventBuilder = mockCreateEventBuilder;

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

describe('getWalletNavbarOptions', () => {
  const mockAccountActionsRef = { current: null };
  const mockSelectedInternalAccount = {
    address: '0x1234567890123456789012345678901234567890',
    id: 'account-1',
    metadata: {
      name: 'Test Account',
      keyring: { type: 'HD Key Tree' },
    },
  };
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    pop: jest.fn(),
  };
  const mockNetworkImageSource = { uri: 'https://example.com/network.png' };

  const defaultProps = {
    accountActionsRef: mockAccountActionsRef,
    selectedInternalAccount: mockSelectedInternalAccount,
    accountName: 'Test Account',
    networkName: 'Ethereum Mainnet',
    networkImageSource: mockNetworkImageSource,
    onPressTitle: jest.fn(),
    navigation: mockNavigation,
    themeColors: mockTheme.colors,
    isNotificationEnabled: false,
    isBackupAndSyncEnabled: null,
    unreadNotificationCount: 0,
    readNotificationCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Function Behavior', () => {
    it('returns navigation options object with header function', () => {
      const options = getWalletNavbarOptions(...Object.values(defaultProps));

      // Verify the function returns a proper navigation options object
      expect(options).toBeDefined();
      expect(typeof options).toBe('object');
      expect(options.header).toBeInstanceOf(Function);
    });

    it('returns consistent options with same inputs', () => {
      const options1 = getWalletNavbarOptions(...Object.values(defaultProps));
      const options2 = getWalletNavbarOptions(...Object.values(defaultProps));

      expect(options1).toBeDefined();
      expect(options2).toBeDefined();
      expect(typeof options1.header).toBe('function');
      expect(typeof options2.header).toBe('function');
    });

    it('handles different account names', () => {
      const customAccountName = 'My Custom Wallet';
      const customProps = {
        ...defaultProps,
        accountName: customAccountName,
      };

      const options = getWalletNavbarOptions(...Object.values(customProps));
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });

    it('handles different network configurations', () => {
      const customNetworkProps = {
        ...defaultProps,
        networkName: 'Polygon Mainnet',
        networkImageSource: { uri: 'https://example.com/polygon.png' },
      };

      const options = getWalletNavbarOptions(
        ...Object.values(customNetworkProps),
      );
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });
  });

  describe('Props Handling', () => {
    it('handles notification states correctly', () => {
      const notificationProps = {
        ...defaultProps,
        isNotificationEnabled: true,
        unreadNotificationCount: 5,
        readNotificationCount: 10,
      };

      const options = getWalletNavbarOptions(
        ...Object.values(notificationProps),
      );
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });

    it('handles different account types', () => {
      const hardwareAccountProps = {
        ...defaultProps,
        selectedInternalAccount: {
          ...mockSelectedInternalAccount,
          metadata: {
            ...mockSelectedInternalAccount.metadata,
            keyring: { type: 'Ledger Hardware' },
          },
        },
      };

      const options = getWalletNavbarOptions(
        ...Object.values(hardwareAccountProps),
      );
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });

    it('handles backup and sync states', () => {
      const backupEnabledProps = {
        ...defaultProps,
        isBackupAndSyncEnabled: true,
      };

      const backupDisabledProps = {
        ...defaultProps,
        isBackupAndSyncEnabled: false,
      };

      const optionsEnabled = getWalletNavbarOptions(
        ...Object.values(backupEnabledProps),
      );
      const optionsDisabled = getWalletNavbarOptions(
        ...Object.values(backupDisabledProps),
      );

      expect(optionsEnabled).toBeDefined();
      expect(optionsDisabled).toBeDefined();
      expect(optionsEnabled.header).toBeInstanceOf(Function);
      expect(optionsDisabled.header).toBeInstanceOf(Function);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing optional callbacks gracefully', () => {
      const propsWithoutOptionalCallbacks = {
        ...defaultProps,
        onPressTitle: undefined,
      };

      expect(() => {
        const options = getWalletNavbarOptions(
          ...Object.values(propsWithoutOptionalCallbacks),
        );
        expect(options).toBeDefined();
      }).not.toThrow();
    });

    it('handles zero notification counts', () => {
      const zeroNotificationProps = {
        ...defaultProps,
        unreadNotificationCount: 0,
        readNotificationCount: 0,
      };

      const options = getWalletNavbarOptions(
        ...Object.values(zeroNotificationProps),
      );
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });

    it('handles large notification counts', () => {
      const largeNotificationProps = {
        ...defaultProps,
        unreadNotificationCount: 999,
        readNotificationCount: 9999,
      };

      const options = getWalletNavbarOptions(
        ...Object.values(largeNotificationProps),
      );
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });

    it('handles different address formats', () => {
      const addressFormats = [
        '0x1234567890123456789012345678901234567890',
        '0xABCDEF1234567890123456789012345678901234ABCD',
        '0x0000000000000000000000000000000000000000',
        '0xffffffffffffffffffffffffffffffffffffffff',
      ];

      addressFormats.forEach((address) => {
        const customProps = {
          ...defaultProps,
          selectedInternalAccount: {
            ...mockSelectedInternalAccount,
            address,
          },
        };

        expect(() => {
          const options = getWalletNavbarOptions(...Object.values(customProps));
          expect(options).toBeDefined();
          expect(options.header).toBeInstanceOf(Function);
        }).not.toThrow();
      });
    });

    it('handles custom theme colors gracefully', () => {
      const propsWithCustomTheme = {
        ...defaultProps,
        themeColors: {
          ...mockTheme.colors,
          background: mockTheme.colors.background.alternative,
          primary: {
            ...mockTheme.colors.primary,
            default: mockTheme.colors.primary.default,
          },
          border: {
            ...mockTheme.colors.border,
            muted: mockTheme.colors.border.default,
          },
        },
      };

      expect(() => {
        const options = getWalletNavbarOptions(
          ...Object.values(propsWithCustomTheme),
        );
        expect(options).toBeDefined();
        expect(options.header).toBeInstanceOf(Function);
      }).not.toThrow();
    });
  });

  describe('Function Parameter Validation', () => {
    it('accepts all required parameters', () => {
      const requiredParams = [
        mockAccountActionsRef,
        mockSelectedInternalAccount,
        'Test Account',
        'Ethereum Mainnet',
        mockNetworkImageSource,
        jest.fn(),
        mockNavigation,
        mockTheme.colors,
        false,
        null,
        0,
        0,
      ];

      expect(() => {
        const options = getWalletNavbarOptions(...requiredParams);
        expect(options).toBeDefined();
        expect(options.header).toBeInstanceOf(Function);
      }).not.toThrow();
    });

    it('maintains function signature consistency', () => {
      // Test that the function accepts the expected number of parameters
      const allParams = Object.values(defaultProps);
      expect(allParams.length).toBe(12); // Verify expected parameter count

      const options = getWalletNavbarOptions(...allParams);
      expect(options).toBeDefined();
      expect(options.header).toBeInstanceOf(Function);
    });
  });

  describe('Return Value Structure', () => {
    it('returns object with expected structure', () => {
      const options = getWalletNavbarOptions(...Object.values(defaultProps));

      expect(options).toMatchObject({
        header: expect.any(Function),
      });
    });

    it('header function can be called without throwing', () => {
      const options = getWalletNavbarOptions(...Object.values(defaultProps));

      expect(() => {
        // Call the header function with minimal props to ensure it doesn't throw
        const headerComponent = options.header({});
        expect(headerComponent).toBeDefined();
      }).not.toThrow();
    });
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
  const analyticsMocks = jest.requireMock('../../../core/Analytics');

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
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(mockEvent);
    expect(mockBuildEvent).toHaveBeenCalled();
    expect(analyticsMocks.__mockTrackEvent).toHaveBeenCalled();
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

    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    expect(analyticsMocks.__mockTrackEvent).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });
});
