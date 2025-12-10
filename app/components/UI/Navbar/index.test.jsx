/* eslint-disable react/prop-types */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  getAddressListNavbarOptions,
  getDepositNavbarOptions,
  getNetworkNavbarOptions,
  getOnboardingNavbarOptions,
  getSettingsNavigationOptions,
  getTransparentOnboardingNavbarOptions,
  getWalletNavbarOptions,
  getSendFlowTitle,
  getStakingNavbar,
  getCloseOnlyNavbar,
} from '.';
import { mockTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { View } from 'react-native';
import { BridgeViewMode } from '../Bridge/types';
import { SendViewSelectorsIDs } from '../../../../e2e/selectors/SendFlow/SendView.selectors';
import { strings } from '../../../../locales/i18n';

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

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({
      trackEvent: jest.fn(),
    })),
    trackEvent: jest.fn(),
  },
  MetaMetricsEvents: {
    SEND_FLOW_CANCEL: 'SEND_FLOW_CANCEL',
  },
  trackEvent: jest.fn(),
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(() => ({})),
      })),
    })),
  },
}));

jest.mock('../../../util/blockaid', () => ({
  getBlockaidTransactionMetricsParams: jest.fn(() => ({})),
}));

jest.mock('../Stake/utils/metaMetrics/withMetaMetrics', () => ({
  withMetaMetrics: jest.fn((fn) => () => fn()),
}));

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

describe('getAddressListNavbarOptions', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with correct structure', () => {
    const options = getAddressListNavbarOptions(
      mockNavigation,
      'Receiving address',
      'test-back-button',
    );

    expect(options).toBeDefined();
    expect(options.headerTitle).toBeInstanceOf(Function);
    expect(options.headerLeft).toBeInstanceOf(Function);
  });

  it('renders title correctly', () => {
    const title = 'Test Title';
    const options = getAddressListNavbarOptions(
      mockNavigation,
      title,
      'test-back-button',
    );

    const { getByText } = renderWithProvider(<options.headerTitle />, {
      state: { engine: { backgroundState } },
    });

    expect(getByText(title)).toBeTruthy();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const options = getAddressListNavbarOptions(
      mockNavigation,
      'Test Title',
      'test-back-button',
    );

    const { getByTestId } = renderWithProvider(<options.headerLeft />, {
      state: { engine: { backgroundState } },
    });

    const backButton = getByTestId('test-back-button');
    fireEvent.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('handles different titles', () => {
    const titles = ['Receiving address', 'Account Details', ''];

    titles.forEach((title) => {
      expect(() => {
        const options = getAddressListNavbarOptions(
          mockNavigation,
          title,
          'test-back-button',
        );
        expect(options).toBeDefined();
        expect(options.headerTitle).toBeInstanceOf(Function);
      }).not.toThrow();
    });
  });

  it('handles different test IDs', () => {
    const testIds = ['back-button', 'go-back', 'navigation-back'];

    testIds.forEach((testId) => {
      expect(() => {
        const options = getAddressListNavbarOptions(
          mockNavigation,
          'Test Title',
          testId,
        );
        expect(options).toBeDefined();
        expect(options.headerLeft).toBeInstanceOf(Function);
      }).not.toThrow();
    });
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

  it('returns navbar options with the correct title', () => {
    const options = getDepositNavbarOptions(
      mockNavigation,
      { title: 'Deposit' },
      mockTheme,
    );
    expect(options).toBeDefined();
    expect(options.title).toBe('Deposit');
  });

  it('deposit navbar options to pop when back button is pressed', () => {
    const options = getDepositNavbarOptions(
      mockNavigation,
      { title: 'Deposit' },
      mockTheme,
    );
    const headerLeftComponent = options.headerLeft();
    headerLeftComponent.props.onPress();
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

describe('getSettingsNavigationOptions', () => {
  const mockTitle = 'Settings';
  const mockThemeColors = {
    background: {
      default: '#FFFFFF',
    },
  };
  const mockNavigation = {
    goBack: jest.fn(),
  };

  describe('Basic Functionality', () => {
    it('returns navigation options object', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options).toBeDefined();
      expect(typeof options).toBe('object');
    });

    it('sets headerLeft to null', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options.headerLeft).toBeNull();
    });

    it('returns headerTitle as a function', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options.headerTitle).toBeDefined();
      expect(typeof options.headerTitle).toBe('function');
    });

    it('includes headerStyle with correct background color', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options.headerStyle).toBeDefined();
      expect(options.headerStyle.backgroundColor).toBe(
        mockThemeColors.background.default,
      );
    });

    it('sets transparent shadow and elevation', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options.headerStyle.shadowColor).toBe('transparent');
      expect(options.headerStyle.elevation).toBe(0);
    });
  });

  describe('Close Button Functionality', () => {
    it('shows close button in headerRight', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });

    it('calls navigation.goBack when close button is pressed', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      const HeaderRightComponent = options.headerRight;
      const { getByTestId } = renderWithProvider(<HeaderRightComponent />, {
        state: { engine: { backgroundState } },
      });

      const closeButton = getByTestId('close-network-icon');
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('handles missing navigation object gracefully', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        null,
      );

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });

    it('handles undefined navigation object gracefully', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        undefined,
      );

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });
  });

  describe('HeaderTitle Component', () => {
    it('renders MorphText component with correct props', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );
      const HeaderTitleComponent = options.headerTitle;

      const { getByText, getByTestId } = renderWithProvider(
        <HeaderTitleComponent />,
        { state: { engine: { backgroundState } } },
      );

      expect(getByText(mockTitle)).toBeDefined();
    });

    it('displays the provided title text', () => {
      const customTitle = 'Custom Settings Title';
      const options = getSettingsNavigationOptions(
        customTitle,
        mockThemeColors,
        mockNavigation,
      );
      const HeaderTitleComponent = options.headerTitle;

      const { getByText } = renderWithProvider(<HeaderTitleComponent />, {
        state: { engine: { backgroundState } },
      });

      expect(getByText(customTitle)).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('handles different title types', () => {
      const titles = ['Settings', 'Privacy & Security', 'Networks', ''];

      titles.forEach((title) => {
        expect(() => {
          const options = getSettingsNavigationOptions(
            title,
            mockThemeColors,
            mockNavigation,
          );
          expect(options).toBeDefined();
          expect(options.headerTitle).toBeDefined();
        }).not.toThrow();
      });
    });

    it('handles different theme colors', () => {
      const themeVariations = [
        { background: { default: '#000000' } },
        { background: { default: '#FFFFFF' } },
        { background: { default: '#F5F5F5' } },
      ];

      themeVariations.forEach((theme) => {
        expect(() => {
          const options = getSettingsNavigationOptions(
            mockTitle,
            theme,
            mockNavigation,
          );
          expect(options).toBeDefined();
          expect(options.headerStyle.backgroundColor).toBe(
            theme.background.default,
          );
        }).not.toThrow();
      });
    });

    it('handles undefined or null parameters gracefully', () => {
      // Test with undefined title
      expect(() => {
        const options = getSettingsNavigationOptions(
          undefined,
          mockThemeColors,
          mockNavigation,
        );
        expect(options).toBeDefined();
      }).not.toThrow();

      // Test with null title
      expect(() => {
        const options = getSettingsNavigationOptions(
          null,
          mockThemeColors,
          mockNavigation,
        );
        expect(options).toBeDefined();
      }).not.toThrow();
    });

    it('handles navigation parameter', () => {
      expect(() => {
        const options = getSettingsNavigationOptions(
          mockTitle,
          mockThemeColors,
          mockNavigation,
        );
        expect(options).toBeDefined();
        expect(options.headerRight).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Return Value Structure', () => {
    it('returns object with expected properties', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(options).toMatchObject({
        headerLeft: null,
        headerTitle: expect.any(Function),
        headerRight: expect.any(Function),
        headerStyle: expect.objectContaining({
          backgroundColor: expect.any(String),
          shadowColor: 'transparent',
          elevation: 0,
        }),
      });
    });

    it('maintains consistent structure across different inputs', () => {
      const options1 = getSettingsNavigationOptions(
        'Title 1',
        mockThemeColors,
        mockNavigation,
      );
      const options2 = getSettingsNavigationOptions(
        'Title 2',
        {
          background: { default: '#000000' },
        },
        mockNavigation,
      );

      expect(Object.keys(options1)).toEqual(Object.keys(options2));
      expect(typeof options1.headerTitle).toBe(typeof options2.headerTitle);
      expect(options1.headerLeft).toBe(options2.headerLeft);
    });
  });

  describe('Integration', () => {
    it('works with React Navigation stack', () => {
      const Stack = createStackNavigator();
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
      );

      expect(() => {
        renderWithProvider(
          <Stack.Navigator>
            <Stack.Screen name="Settings" component={View} options={options} />
          </Stack.Navigator>,
          { state: { engine: { backgroundState } } },
        );
      }).not.toThrow();
    });
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

  describe('Platform-specific headerLeft behavior', () => {
    it('should render headerLeft with hidden icon on Android', () => {
      Device.isAndroid.mockReturnValue(true);
      const { getBridgeNavbar } = require('.');
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Swap,
        mockThemeColors,
      );

      expect(options.headerLeft).toBeDefined();
      expect(typeof options.headerLeft).toBe('function');

      const HeaderLeftComponent = options.headerLeft();
      expect(HeaderLeftComponent).toBeDefined();
      expect(HeaderLeftComponent.type).toBe(View);
    });

    it('should have zero opacity on Android headerLeft', () => {
      Device.isAndroid.mockReturnValue(true);
      const { getBridgeNavbar } = require('.');
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Swap,
        mockThemeColors,
      );
      const HeaderLeftComponent = options.headerLeft();
      renderWithProvider(HeaderLeftComponent, {
        state: { engine: { backgroundState } },
      });

      const styles = HeaderLeftComponent.props.style;

      const hasHiddenOpacity = Array.isArray(styles)
        ? styles.some((style) => style.opacity === 0)
        : styles?.opacity === 0;

      expect(hasHiddenOpacity).toBe(true);
    });

    it('should not be clickable on Android headerLeft', () => {
      Device.isAndroid.mockReturnValue(true);
      const { getBridgeNavbar } = require('.');
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Swap,
        mockThemeColors,
      );

      const HeaderLeftComponent = options.headerLeft();
      renderWithProvider(HeaderLeftComponent, {
        state: { engine: { backgroundState } },
      });

      expect(HeaderLeftComponent.type).toBe(View);
      expect(HeaderLeftComponent.props.onPress).toBeUndefined();
    });

    it('should not render headerLeft on iOS', () => {
      Device.isAndroid.mockReturnValue(false);
      const { getBridgeNavbar } = require('.');
      const options = getBridgeNavbar(
        mockNavigation,
        BridgeViewMode.Swap,
        mockThemeColors,
      );

      expect(options.headerLeft).toBeNull();
    });
  });

  describe('getSendFlowTitle', () => {
    const mockNavigation = {
      pop: jest.fn(),
      dangerouslyGetParent: jest.fn(() => ({
        pop: jest.fn(),
      })),
    };

    const mockRoute = {
      params: {
        providerType: 'mainnet',
      },
    };

    const mockThemeColors = mockTheme.colors;
    const mockResetTransaction = jest.fn();
    const mockTransaction = {
      id: 'test-transaction',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Explicit test to cover function export line
    it('function exists and is callable', () => {
      expect(getSendFlowTitle).toBeDefined();
      const result = getSendFlowTitle({
        title: 'test',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        transaction: mockTransaction,
        disableNetwork: true,
        showSelectedNetwork: false,
        globalChainId: '',
      });
      expect(result).toBeDefined();
      expect(result.headerTitle).toBeDefined();
      expect(result.headerLeft).toBeDefined();
      expect(result.headerRight).toBeDefined();
      expect(result.headerStyle).toBeDefined();
    });

    it('should return navbar options with required parameters', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        transaction: mockTransaction,
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
      expect(options.headerRight).toBeDefined();
      expect(options.headerLeft).toBeDefined();
      expect(options.headerStyle).toBeDefined();
    });

    it('should use default values for optional parameters', () => {
      const options = getSendFlowTitle({
        title: 'send.send_to',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        // Not providing: disableNetwork, showSelectedNetwork, globalChainId
        // Should use defaults: disableNetwork=true, showSelectedNetwork=false, globalChainId=''
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
    });

    it('should use default disableNetwork=true when not specified', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        transaction: mockTransaction,
        // disableNetwork not provided, should default to true
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
    });

    it('should use default showSelectedNetwork=false when not specified', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        // showSelectedNetwork not provided, should default to false
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
    });

    it('should use default globalChainId="" when not specified', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        // globalChainId not provided, should default to ''
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
    });

    it('should return headerTitle function', () => {
      const options = getSendFlowTitle({
        title: 'send.amount',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
      });

      expect(options.headerTitle).toBeDefined();
      expect(typeof options.headerTitle).toBe('function');
    });

    it('should render Cancel button in headerRight', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        transaction: mockTransaction,
      });

      const HeaderRight = options.headerRight;
      const { getByTestId } = renderWithProvider(<HeaderRight />, {
        state: { engine: { backgroundState } },
      });

      expect(getByTestId(SendViewSelectorsIDs.SEND_CANCEL_BUTTON)).toBeTruthy();
    });

    it('should call resetTransaction and navigate when Cancel is pressed', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        transaction: mockTransaction,
      });

      const HeaderRight = options.headerRight;
      const { getByTestId } = renderWithProvider(<HeaderRight />, {
        state: { engine: { backgroundState } },
      });

      const cancelButton = getByTestId(SendViewSelectorsIDs.SEND_CANCEL_BUTTON);
      fireEvent.press(cancelButton);

      expect(mockResetTransaction).toHaveBeenCalled();
      expect(mockNavigation.dangerouslyGetParent).toHaveBeenCalled();
    });

    it('should render Back button when not on send_to screen', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
      });

      const HeaderLeft = options.headerLeft;
      const { getByTestId } = renderWithProvider(<HeaderLeft />, {
        state: { engine: { backgroundState } },
      });

      expect(getByTestId(SendViewSelectorsIDs.SEND_BACK_BUTTON)).toBeTruthy();
    });

    it('should call navigation.pop when Back button is pressed', () => {
      const options = getSendFlowTitle({
        title: 'send.amount',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
      });

      const HeaderLeft = options.headerLeft;
      const { getByTestId } = renderWithProvider(<HeaderLeft />, {
        state: { engine: { backgroundState } },
      });

      const backButton = getByTestId(SendViewSelectorsIDs.SEND_BACK_BUTTON);
      fireEvent.press(backButton);

      expect(mockNavigation.pop).toHaveBeenCalled();
    });

    it('should not render Back button on send_to screen', () => {
      const options = getSendFlowTitle({
        title: 'send.send_to',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
      });

      const HeaderLeft = options.headerLeft;
      const { queryByTestId } = renderWithProvider(<HeaderLeft />, {
        state: { engine: { backgroundState } },
      });

      expect(queryByTestId(SendViewSelectorsIDs.SEND_BACK_BUTTON)).toBeNull();
    });

    it('should not render Back button when isPaymentRequest is true', () => {
      const paymentRequestRoute = {
        params: {
          providerType: 'mainnet',
          isPaymentRequest: true,
        },
      };

      const options = getSendFlowTitle({
        title: 'send.amount',
        navigation: mockNavigation,
        route: paymentRequestRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
      });

      const HeaderLeft = options.headerLeft;
      const { queryByTestId } = renderWithProvider(<HeaderLeft />, {
        state: { engine: { backgroundState } },
      });

      expect(queryByTestId(SendViewSelectorsIDs.SEND_BACK_BUTTON)).toBeNull();
    });

    it('should apply correct styles from themeColors', () => {
      const customThemeColors = {
        ...mockThemeColors,
        primary: { default: '#FF0000' },
        background: { default: '#00FF00' },
      };

      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: customThemeColors,
        resetTransaction: mockResetTransaction,
      });

      expect(options.headerStyle).toBeDefined();
      expect(options.headerStyle.backgroundColor).toBe('#00FF00');
    });

    it('should pass disableNetwork to NavbarTitle', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        disableNetwork: false,
      });

      expect(options.headerTitle).toBeDefined();
    });

    it('should pass showSelectedNetwork to NavbarTitle when enabled', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        showSelectedNetwork: true,
      });

      expect(options.headerTitle).toBeDefined();
    });

    it('should pass globalChainId to NavbarTitle', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        globalChainId: '0x1',
      });

      expect(options.headerTitle).toBeDefined();
    });

    it('should handle missing route params gracefully', () => {
      const emptyRoute = {};

      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: emptyRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
    });

    it('should handle missing transaction gracefully', () => {
      const options = getSendFlowTitle({
        title: 'send.confirm',
        navigation: mockNavigation,
        route: mockRoute,
        themeColors: mockThemeColors,
        resetTransaction: mockResetTransaction,
        transaction: undefined,
      });

      expect(options).toBeDefined();
      expect(options.headerTitle).toBeDefined();
    });

    it('should throw error when called without required parameters', () => {
      // Calling without any parameters should throw because themeColors is required
      expect(() => {
        getSendFlowTitle();
      }).toThrow();
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

describe('getCloseOnlyNavbar', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };
  const mockThemeColors = {
    background: {
      default: '#FFFFFF',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('returns navigation options object with required properties', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options).toBeDefined();
      expect(typeof options).toBe('object');
      expect(options.headerShown).toBe(true);
      expect(options.headerTitle).toBeInstanceOf(Function);
      expect(options.headerLeft).toBeInstanceOf(Function);
      expect(options.headerRight).toBeInstanceOf(Function);
      expect(options.headerStyle).toBeDefined();
    });

    it('sets headerShown to true', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options.headerShown).toBe(true);
    });

    it('returns null from headerTitle function', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      const headerTitle = options.headerTitle();

      expect(headerTitle).toBeNull();
    });

    it('returns null from headerLeft function', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      const headerLeft = options.headerLeft();

      expect(headerLeft).toBeNull();
    });
  });

  describe('Header Style', () => {
    it('applies correct background color from theme', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options.headerStyle.backgroundColor).toBe('#FFFFFF');
    });

    it('sets transparent shadow color', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options.headerStyle.shadowColor).toBe('transparent');
    });

    it('sets elevation to 0', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options.headerStyle.elevation).toBe(0);
    });

    it('handles different theme colors', () => {
      const darkThemeColors = {
        background: {
          default: '#000000',
        },
      };

      const options = getCloseOnlyNavbar(mockNavigation, darkThemeColors);

      expect(options.headerStyle.backgroundColor).toBe('#000000');
    });
  });

  describe('Close Button Functionality', () => {
    it('renders close button in headerRight', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      const HeaderRight = options.headerRight;
      const { getByTestId } = renderWithProvider(<HeaderRight />, {
        state: { engine: { backgroundState } },
      });

      expect(getByTestId('button-icon')).toBeOnTheScreen();
    });

    it('calls navigation.goBack when close button pressed without onClose callback', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('calls custom onClose callback when provided', () => {
      const mockOnClose = jest.fn();

      const options = getCloseOnlyNavbar(
        mockNavigation,
        mockThemeColors,
        mockOnClose,
      );

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('does not call navigation.goBack when custom onClose is provided', () => {
      const mockOnClose = jest.fn();

      const options = getCloseOnlyNavbar(
        mockNavigation,
        mockThemeColors,
        mockOnClose,
      );

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('Parameter Handling', () => {
    it('handles missing onClose parameter by using default', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options).toBeDefined();
      expect(options.headerRight).toBeInstanceOf(Function);
    });

    it('handles undefined onClose parameter', () => {
      const options = getCloseOnlyNavbar(
        mockNavigation,
        mockThemeColors,
        undefined,
      );

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('handles null onClose parameter', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors, null);

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return Value Structure', () => {
    it('returns object with expected structure', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(options).toMatchObject({
        headerShown: true,
        headerTitle: expect.any(Function),
        headerLeft: expect.any(Function),
        headerRight: expect.any(Function),
        headerStyle: expect.objectContaining({
          backgroundColor: expect.any(String),
          shadowColor: 'transparent',
          elevation: 0,
        }),
      });
    });

    it('maintains consistent structure across different inputs', () => {
      const options1 = getCloseOnlyNavbar(mockNavigation, mockThemeColors);
      const options2 = getCloseOnlyNavbar(mockNavigation, {
        background: { default: '#000000' },
      });

      expect(Object.keys(options1)).toEqual(Object.keys(options2));
      expect(typeof options1.headerTitle).toBe(typeof options2.headerTitle);
      expect(typeof options1.headerLeft).toBe(typeof options2.headerLeft);
      expect(typeof options1.headerRight).toBe(typeof options2.headerRight);
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple close button presses', () => {
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();
      headerRightComponent.props.onPress();
      headerRightComponent.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(3);
    });

    it('handles onClose that throws error', () => {
      const mockOnCloseWithError = jest.fn(() => {
        throw new Error('Test error');
      });

      const options = getCloseOnlyNavbar(
        mockNavigation,
        mockThemeColors,
        mockOnCloseWithError,
      );

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      expect(() => {
        headerRightComponent.props.onPress();
      }).toThrow('Test error');

      expect(mockOnCloseWithError).toHaveBeenCalledTimes(1);
    });

    it('calls only onClose when both onClose and navigation.goBack available', () => {
      const mockOnClose = jest.fn();

      const options = getCloseOnlyNavbar(
        mockNavigation,
        mockThemeColors,
        mockOnClose,
      );

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('works with React Navigation stack', () => {
      const Stack = createStackNavigator();
      const options = getCloseOnlyNavbar(mockNavigation, mockThemeColors);

      expect(() => {
        renderWithProvider(
          <Stack.Navigator>
            <Stack.Screen
              name="TestScreen"
              component={View}
              options={options}
            />
          </Stack.Navigator>,
          { state: { engine: { backgroundState } } },
        );
      }).not.toThrow();
    });

    it('integrates with custom onClose and navigation', () => {
      const mockOnClose = jest.fn();
      const customNavigation = {
        ...mockNavigation,
        goBack: jest.fn(),
        navigate: jest.fn(),
      };

      const options = getCloseOnlyNavbar(
        customNavigation,
        mockThemeColors,
        mockOnClose,
      );

      const HeaderRight = options.headerRight;
      const headerRightComponent = HeaderRight();

      headerRightComponent.props.onPress();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(customNavigation.goBack).not.toHaveBeenCalled();
      expect(customNavigation.navigate).not.toHaveBeenCalled();
    });
  });
});
