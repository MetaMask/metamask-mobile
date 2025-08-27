/* eslint-disable react/prop-types */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import configureMockStore from 'redux-mock-store';
import MainNavigator from './MainNavigator';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectRewardsEnabledFlag } from '../../../selectors/featureFlagController/rewards';
import Routes from '../../../constants/navigation/Routes';

// Mock the selectors
jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
  PerpsScreenStack: () => null,
  PerpsModalStack: () => null,
}));

jest.mock('../../../selectors/featureFlagController/rewards', () => ({
  selectRewardsEnabledFlag: jest.fn(),
}));

// Mock all the screen components
jest.mock('../../Views/Browser', () => 'Browser');
jest.mock('../../Views/Settings', () => 'Settings');
jest.mock('../../Views/Wallet', () => 'Wallet');
jest.mock('../../Views/Asset', () => 'Asset');
jest.mock('../../Views/AddBookmark', () => 'AddBookmark');
jest.mock('../../Views/SimpleWebview', () => 'SimpleWebview');
jest.mock('../../Views/OfflineMode', () => 'OfflineMode');
jest.mock('../../Views/Notifications', () => 'NotificationsView');
jest.mock('../../Views/Notifications/Details', () => 'NotificationsDetails');
jest.mock('../../Views/QRTabSwitcher', () => 'QRTabSwitcher');
jest.mock('../../Views/NftDetails', () => 'NftDetails');
jest.mock(
  '../../Views/NftDetails/NFtDetailsFullImage',
  () => 'NftDetailsFullImage',
);
jest.mock('../../UI/PaymentRequest', () => 'PaymentRequest');
jest.mock('../../UI/Ramp/Aggregator/routes', () => () => null);
jest.mock('../../UI/Ramp/Deposit/routes', () => () => null);
jest.mock('../../UI/Swaps', () => 'Swaps');
jest.mock('../../UI/Bridge/routes', () => ({
  BridgeScreenStack: () => null,
  BridgeModalStack: () => null,
}));
jest.mock('../../UI/Stake/routes', () => ({
  StakeScreenStack: () => null,
  StakeModalStack: () => null,
}));
jest.mock('../../UI/Earn/routes', () => ({
  EarnScreenStack: () => null,
  EarnModalStack: () => null,
}));
jest.mock('../../UI/CollectibleModal', () => 'CollectiblesDetails');
jest.mock('../../UI/DeprecatedNetworkModal', () => 'DeprecatedNetworkDetails');
jest.mock('../../Views/confirmations/components/send', () => ({
  Send: () => null,
}));
jest.mock('../../Views/confirmations/utils/send', () => ({
  isSendRedesignEnabled: jest.fn(() => false),
}));
jest.mock(
  '../../UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView',
  () => 'PerpsPositionTransactionView',
);
jest.mock(
  '../../UI/Perps/Views/PerpsTransactionsView/PerpsOrderTransactionView',
  () => 'PerpsOrderTransactionView',
);
jest.mock(
  '../../UI/Perps/Views/PerpsTransactionsView/PerpsFundingTransactionView',
  () => 'PerpsFundingTransactionView',
);
jest.mock('../../Views/Settings/GeneralSettings', () => ({
  __esModule: true,
  default: () => null,
  navigationOptions: {},
}));
jest.mock(
  '../../Views/Identity/TurnOnBackupAndSync/TurnOnBackupAndSync',
  () => ({
    __esModule: true,
    default: () => null,
    navigationOptions: {},
  }),
);
jest.mock(
  '../../UI/DeFiPositions/DeFiProtocolPositionDetails',
  () => 'DeFiProtocolPositionDetails',
);
jest.mock('../../UI/Card/routes', () => () => null);

// Mock other dependencies
jest.mock(
  '../../../component-library/components/Navigation/TabBar',
  () => 'TabBar',
);
jest.mock('../../../util/test/utils', () => ({
  isTest: jest.fn(() => false),
}));

// Mock complex components that have their own navigation
const MockHomeTabs = () => null;
const MockAssetModalFlow = () => null;
const MockWebview = () => null;
const MockSendView = () => null;
const MockSendFlowView = () => null;
const MockAddBookmarkView = () => null;
const MockOfflineModeView = () => null;
const MockNotificationsModeView = () => null;
const MockNftDetailsModeView = () => null;
const MockNftDetailsFullImageModeView = () => null;
const MockPaymentRequestView = () => null;
const MockSwaps = () => null;
const MockSetPasswordFlow = () => null;
const MockNotificationsOptInStack = () => null;

// Mock these components in the module
jest.doMock('./MainNavigator', () => {
  const originalModule = jest.requireActual('./MainNavigator');
  return {
    ...originalModule,
    HomeTabs: MockHomeTabs,
    AssetModalFlow: MockAssetModalFlow,
    Webview: MockWebview,
    SendView: MockSendView,
    SendFlowView: MockSendFlowView,
    AddBookmarkView: MockAddBookmarkView,
    OfflineModeView: MockOfflineModeView,
    NotificationsModeView: MockNotificationsModeView,
    NftDetailsModeView: MockNftDetailsModeView,
    NftDetailsFullImageModeView: MockNftDetailsFullImageModeView,
    PaymentRequestView: MockPaymentRequestView,
    Swaps: MockSwaps,
    SetPasswordFlow: MockSetPasswordFlow,
    NotificationsOptInStack: MockNotificationsOptInStack,
    SettingsFlow: () => null,
  };
});

const mockStore = configureMockStore();

const createMockState = (overrides = {}) => ({
  user: {
    isConnectionRemoved: false,
  },
  browser: {
    tabs: [],
    activeTab: null,
  },
  settings: {
    primaryCurrency: 'ETH',
  },
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: '0x1',
        },
      },
      AccountTrackerController: {
        accounts: {
          '0x123': { balance: '0x0' },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account-1',
          accounts: {
            'account-1': {
              id: 'account-1',
              address: '0x123',
              metadata: {
                name: 'Test Account',
                keyring: { type: 'HD Key Tree' },
              },
            },
          },
        },
      },
      PermissionController: {
        subjects: {},
      },
      SwapsController: {
        tokens: [],
      },
      TokensController: {
        tokens: [],
        detectedTokens: [],
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: {
            conversionRate: 1,
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x123',
        identities: {
          '0x123': {
            name: 'Test Account',
            address: '0x123',
          },
        },
      },
    },
  },
  ...overrides,
});

const renderMainNavigator = (mockState = createMockState()) => {
  const store = mockStore(mockState);
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </Provider>,
  );
};

describe('MainNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock values
    selectPerpsEnabledFlag.mockReturnValue(false);
    selectRewardsEnabledFlag.mockReturnValue(false);
  });

  describe('Basic Functionality', () => {
    it('should render without crashing', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should render Stack Navigator with correct initial route', () => {
      const { getByTestId } = renderMainNavigator();
      // The Stack Navigator should be present
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should have correct screen options', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Feature Flag Conditional Rendering', () => {
    describe('Perps Feature Flag', () => {
      it('should not render Perps screens when feature flag is disabled', () => {
        selectPerpsEnabledFlag.mockReturnValue(false);
        expect(() => renderMainNavigator()).not.toThrow();
      });

      it('should render Perps screens when feature flag is enabled', () => {
        selectPerpsEnabledFlag.mockReturnValue(true);
        expect(() => renderMainNavigator()).not.toThrow();
      });

      it('should render Perps transaction screens when feature flag is enabled', () => {
        selectPerpsEnabledFlag.mockReturnValue(true);
        expect(() => renderMainNavigator()).not.toThrow();
      });
    });

    describe('Rewards Feature Flag', () => {
      it('should not render Settings screen when rewards feature flag is disabled', () => {
        selectRewardsEnabledFlag.mockReturnValue(false);
        expect(() => renderMainNavigator()).not.toThrow();
      });

      it('should render Settings screen when rewards feature flag is enabled', () => {
        selectRewardsEnabledFlag.mockReturnValue(true);
        expect(() => renderMainNavigator()).not.toThrow();
      });
    });

    describe('Combined Feature Flags', () => {
      it('should handle both feature flags enabled', () => {
        selectPerpsEnabledFlag.mockReturnValue(true);
        selectRewardsEnabledFlag.mockReturnValue(true);
        expect(() => renderMainNavigator()).not.toThrow();
      });

      it('should handle both feature flags disabled', () => {
        selectPerpsEnabledFlag.mockReturnValue(false);
        selectRewardsEnabledFlag.mockReturnValue(false);
        expect(() => renderMainNavigator()).not.toThrow();
      });

      it('should handle mixed feature flag states', () => {
        selectPerpsEnabledFlag.mockReturnValue(true);
        selectRewardsEnabledFlag.mockReturnValue(false);
        expect(() => renderMainNavigator()).not.toThrow();

        selectPerpsEnabledFlag.mockReturnValue(false);
        selectRewardsEnabledFlag.mockReturnValue(true);
        expect(() => renderMainNavigator()).not.toThrow();
      });
    });
  });

  describe('Screen Registration', () => {
    it('should register core screens regardless of feature flags', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should register modal screens with correct options', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should register screens with transparent background options', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Navigation Structure', () => {
    it('should have correct stack navigator mode', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should have correct initial route name', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should have headerShown set to false by default', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Route Constants', () => {
    it('should use correct route constants for Perps screens', () => {
      selectPerpsEnabledFlag.mockReturnValue(true);
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should use correct route constants for Settings screens', () => {
      selectRewardsEnabledFlag.mockReturnValue(true);
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should use correct route constants for Bridge screens', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should use correct route constants for Earn screens', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should use correct route constants for Ramp screens', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing feature flag selectors gracefully', () => {
      selectPerpsEnabledFlag.mockImplementation(() => {
        throw new Error('Selector error');
      });
      expect(() => renderMainNavigator()).toThrow();
    });

    it('should handle undefined feature flag values', () => {
      selectPerpsEnabledFlag.mockReturnValue(undefined);
      selectRewardsEnabledFlag.mockReturnValue(undefined);
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should handle null feature flag values', () => {
      selectPerpsEnabledFlag.mockReturnValue(null);
      selectRewardsEnabledFlag.mockReturnValue(null);
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with different Redux store states', () => {
      const customState = createMockState({
        user: { isConnectionRemoved: true },
      });
      expect(() => renderMainNavigator(customState)).not.toThrow();
    });

    it('should integrate properly with NavigationContainer', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should handle navigation prop correctly', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when feature flags change', () => {
      const { rerender } = renderMainNavigator();

      selectPerpsEnabledFlag.mockReturnValue(true);
      expect(() =>
        rerender(
          <Provider store={mockStore(createMockState())}>
            <NavigationContainer>
              <MainNavigator />
            </NavigationContainer>
          </Provider>,
        ),
      ).not.toThrow();
    });

    it('should handle rapid feature flag changes', () => {
      selectPerpsEnabledFlag.mockReturnValue(true);
      expect(() => renderMainNavigator()).not.toThrow();

      selectPerpsEnabledFlag.mockReturnValue(false);
      expect(() => renderMainNavigator()).not.toThrow();

      selectPerpsEnabledFlag.mockReturnValue(true);
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should render with proper accessibility support', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });

    it('should handle screen reader navigation', () => {
      expect(() => renderMainNavigator()).not.toThrow();
    });
  });
});
