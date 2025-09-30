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
} from '.';
import { mockTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { View } from 'react-native';

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
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(() => false),
  getNetworkNameFromProviderConfig: jest.fn(() => 'Ethereum Mainnet'),
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
    it('should return navigation options object', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

      expect(options).toBeDefined();
      expect(typeof options).toBe('object');
    });

    it('should set headerLeft to null', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

      expect(options.headerLeft).toBeNull();
    });

    it('should return headerTitle as a function', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

      expect(options.headerTitle).toBeDefined();
      expect(typeof options.headerTitle).toBe('function');
    });

    it('should include headerStyle with correct background color', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

      expect(options.headerStyle).toBeDefined();
      expect(options.headerStyle.backgroundColor).toBe(
        mockThemeColors.background.default,
      );
    });

    it('should set transparent shadow and elevation', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

      expect(options.headerStyle.shadowColor).toBe('transparent');
      expect(options.headerStyle.elevation).toBe(0);
    });
  });

  describe('Rewards Enabled Functionality', () => {
    it('should show close button when rewards are enabled', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
        true,
      );

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });

    it('should not show close button when rewards are disabled', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
        false,
      );

      expect(options.headerRight()).toBeNull();
    });

    it('should call navigation.goBack when close button is pressed', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        mockNavigation,
        true,
      );

      const HeaderRightComponent = options.headerRight;
      const { getByTestId } = renderWithProvider(<HeaderRightComponent />, {
        state: { engine: { backgroundState } },
      });

      const closeButton = getByTestId('close-network-icon');
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('should handle missing navigation object gracefully', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        null,
        true,
      );

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });

    it('should handle undefined navigation object when rewards enabled', () => {
      const options = getSettingsNavigationOptions(
        mockTitle,
        mockThemeColors,
        undefined,
        true,
      );

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });
  });

  describe('HeaderTitle Component', () => {
    it('should render MorphText component with correct props', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);
      const HeaderTitleComponent = options.headerTitle;

      const { getByText, getByTestId } = renderWithProvider(
        <HeaderTitleComponent />,
        { state: { engine: { backgroundState } } },
      );

      expect(getByText(mockTitle)).toBeDefined();
    });

    it('should display the provided title text', () => {
      const customTitle = 'Custom Settings Title';
      const options = getSettingsNavigationOptions(
        customTitle,
        mockThemeColors,
      );
      const HeaderTitleComponent = options.headerTitle;

      const { getByText } = renderWithProvider(<HeaderTitleComponent />, {
        state: { engine: { backgroundState } },
      });

      expect(getByText(customTitle)).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should handle different title types', () => {
      const titles = ['Settings', 'Privacy & Security', 'Networks', ''];

      titles.forEach((title) => {
        expect(() => {
          const options = getSettingsNavigationOptions(title, mockThemeColors);
          expect(options).toBeDefined();
          expect(options.headerTitle).toBeDefined();
        }).not.toThrow();
      });
    });

    it('should handle different theme colors', () => {
      const themeVariations = [
        { background: { default: '#000000' } },
        { background: { default: '#FFFFFF' } },
        { background: { default: '#F5F5F5' } },
      ];

      themeVariations.forEach((theme) => {
        expect(() => {
          const options = getSettingsNavigationOptions(mockTitle, theme);
          expect(options).toBeDefined();
          expect(options.headerStyle.backgroundColor).toBe(
            theme.background.default,
          );
        }).not.toThrow();
      });
    });

    it('should handle undefined or null parameters gracefully', () => {
      // Test with undefined title
      expect(() => {
        const options = getSettingsNavigationOptions(
          undefined,
          mockThemeColors,
        );
        expect(options).toBeDefined();
      }).not.toThrow();

      // Test with null title
      expect(() => {
        const options = getSettingsNavigationOptions(null, mockThemeColors);
        expect(options).toBeDefined();
      }).not.toThrow();
    });

    it('should handle new navigation and isRewardsEnabled parameters', () => {
      expect(() => {
        const options = getSettingsNavigationOptions(
          mockTitle,
          mockThemeColors,
          mockNavigation,
          true,
        );
        expect(options).toBeDefined();
        expect(options.headerRight).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const options = getSettingsNavigationOptions(
          mockTitle,
          mockThemeColors,
          mockNavigation,
          false,
        );
        expect(options).toBeDefined();
        expect(options.headerRight()).toBeNull();
      }).not.toThrow();
    });
  });

  describe('Return Value Structure', () => {
    it('should return object with expected properties', () => {
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

      expect(options).toMatchObject({
        headerLeft: null,
        headerTitle: expect.any(Function),
        headerStyle: expect.objectContaining({
          backgroundColor: expect.any(String),
          shadowColor: 'transparent',
          elevation: 0,
        }),
      });
    });

    it('should maintain consistent structure across different inputs', () => {
      const options1 = getSettingsNavigationOptions('Title 1', mockThemeColors);
      const options2 = getSettingsNavigationOptions('Title 2', {
        background: { default: '#000000' },
      });

      expect(Object.keys(options1)).toEqual(Object.keys(options2));
      expect(typeof options1.headerTitle).toBe(typeof options2.headerTitle);
      expect(options1.headerLeft).toBe(options2.headerLeft);
    });
  });

  describe('Integration', () => {
    it('should work with React Navigation stack', () => {
      const Stack = createStackNavigator();
      const options = getSettingsNavigationOptions(mockTitle, mockThemeColors);

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
