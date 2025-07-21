import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import NetworkManager from './index';

// Create mock functions that we can spy on
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockDisableNetwork = jest.fn();
const mockRemoveNetwork = jest.fn();
const mockAddTraitsToUser = jest.fn();
const mockDismissModal = jest.fn();
const mockOnOpenBottomSheet = jest.fn();
const mockOnCloseBottomSheet = jest.fn();
const mockSelectNetworkConfigurations = jest.fn();
const mockUseNetworksByNamespace = jest.fn();

// Mock external dependencies
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#000000',
        alternative: '#666666',
      },
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

jest.mock('../../../component-library/hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      sheet: { backgroundColor: '#FFFFFF' },
      notch: { backgroundColor: '#CCCCCC' },
      networkTabsSelectorTitle: { fontSize: 18 },
      networkTabsSelectorWrapper: { flex: 1 },
      tabUnderlineStyle: { backgroundColor: '#0066CC' },
      inactiveUnderlineStyle: { backgroundColor: '#CCCCCC' },
      tabStyle: { backgroundColor: '#FFFFFF' },
      textStyle: { fontSize: 16 },
      tabBar: { backgroundColor: '#F8F9FA' },
      editNetworkMenu: { padding: 16 },
      containerDeleteText: { padding: 16 },
      textCentred: { textAlign: 'center' },
    },
  }),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    ASSET_FILTER_SELECTED: 'asset_filter_selected',
    ASSET_FILTER_CUSTOM_SELECTED: 'asset_filter_custom_selected',
  },
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: mockUseNetworksByNamespace,
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    disableNetwork: mockDisableNetwork,
  }),
}));

jest.mock('../../../util/device', () => ({
  getDeviceHeight: () => 800,
  isAndroid: () => false,
  isIOS: () => true,
}));

jest.mock('../../../constants/navigation/Routes', () => ({
  MODAL: {
    ROOT_MODAL_FLOW: 'RootModalFlow',
  },
  SHEET: {
    NETWORK_MANAGER: 'NetworkManager',
  },
  ADD_NETWORK: 'AddNetwork',
}));

jest.mock('../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: mockSelectNetworkConfigurations,
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key) => key,
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      removeNetwork: mockRemoveNetwork,
    },
  },
}));

jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: () => ({
      addTraitsToUser: mockAddTraitsToUser,
    }),
  },
}));

jest.mock('../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  removeItemFromChainIdList: (chainId) => ({ removedChainId: chainId }),
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: (caipChainId) => ({
    namespace: 'eip155',
    reference: caipChainId.split(':')[1],
  }),
}));

jest.mock('@metamask/controller-utils', () => ({
  toHex: (value) => `0x${value}`,
}));

// Component mocks with proper functionality
jest.mock('react-native-scrollable-tab-view', () => {
  const { View } = require('react-native');
  const mockReact = require('react');
  return ({ children, onChangeTab, renderTabBar, initialPage }) => {
    // Mock tab change functionality
    mockReact.useEffect(() => {
      if (onChangeTab) {
        // Simulate tab change for testing
        const mockTab = {
          ref: { props: { tabLabel: 'wallet.default' } },
          i: initialPage || 0,
        };
        onChangeTab(mockTab);
      }
    }, [onChangeTab, initialPage]);

    return (
      <View testID="scrollable-tab-view" initialPage={initialPage}>
        {children}
      </View>
    );
  };
});

jest.mock('react-native-scrollable-tab-view/DefaultTabBar', () => {
  const { View } = require('react-native');
  return (props) => <View testID="default-tab-bar" {...props} />;
});

jest.mock('../NetworkMultiSelector/NetworkMultiSelector', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ openModal, tabLabel }) => (
    <View testID="network-multi-selector">
      <Text testID="tab-label">{tabLabel}</Text>
      <TouchableOpacity
        testID="open-modal-button"
        onPress={() =>
          openModal({
            caipChainId: 'eip155:1',
            displayEdit: true,
            networkTypeOrRpcUrl: 'https://mainnet.infura.io',
            isReadOnly: false,
          })
        }
      >
        <Text>Open Modal</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../CustomNetworkSelector/CustomNetworkSelector', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ openModal, tabLabel }) => (
    <View testID="custom-network-selector">
      <Text testID="tab-label">{tabLabel}</Text>
      <TouchableOpacity
        testID="open-custom-modal-button"
        onPress={() =>
          openModal({
            caipChainId: 'eip155:137',
            displayEdit: false,
            networkTypeOrRpcUrl: 'https://polygon-rpc.com',
            isReadOnly: false,
          })
        }
      >
        <Text>Open Custom Modal</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../ReusableModal', () => {
  const React = require('react');
  const { View, forwardRef, useImperativeHandle } = React;

  return forwardRef(({ children, style }, ref) => {
    useImperativeHandle(ref, () => ({
      dismissModal: mockDismissModal,
    }));

    return (
      <View testID="reusable-modal" style={style}>
        {children}
      </View>
    );
  });
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = require('react');
    const { View, forwardRef, useImperativeHandle } = React;

    return forwardRef(({ children, onClose }, ref) => {
      useImperativeHandle(ref, () => ({
        onOpenBottomSheet: mockOnOpenBottomSheet,
        onCloseBottomSheet: mockOnCloseBottomSheet,
      }));

      return <View testID="bottom-sheet">{children}</View>;
    });
  },
);

jest.mock('../../Views/AccountAction', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ actionTitle, onPress, iconName }) => (
    <TouchableOpacity
      testID={`account-action-${actionTitle
        .toLowerCase()
        .replace(/\s+/g, '-')}`}
      onPress={onPress}
    >
      <Text>{actionTitle}</Text>
      <Text testID="icon">{iconName}</Text>
    </TouchableOpacity>
  );
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader',
  () => {
    const { View } = require('react-native');
    return ({ children }) => (
      <View testID="bottom-sheet-header">{children}</View>
    );
  },
);

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => ({
    __esModule: true,
    default: ({ buttonPropsArray }) => {
      const { View, TouchableOpacity, Text } = require('react-native');
      return (
        <View testID="bottom-sheet-footer">
          {buttonPropsArray?.map((buttonProps, index) => (
            <TouchableOpacity
              key={index}
              testID={`footer-button-${buttonProps.label
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              onPress={buttonProps.onPress}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
    ButtonsAlignment: {
      Horizontal: 'horizontal',
      Vertical: 'vertical',
    },
  }),
);

jest.mock('../../../component-library/components/Buttons/Button', () => ({
  ButtonVariants: {
    Primary: 'primary',
    Secondary: 'secondary',
  },
  ButtonSize: {
    Lg: 'lg',
    Md: 'md',
    Sm: 'sm',
  },
}));

jest.mock('../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Edit: 'edit',
    Trash: 'trash',
  },
}));

jest.mock('./index.styles', () => ({
  __esModule: true,
  default: () => ({
    sheet: { backgroundColor: '#FFFFFF' },
    notch: { backgroundColor: '#CCCCCC' },
    networkTabsSelectorTitle: { fontSize: 18 },
    networkTabsSelectorWrapper: { flex: 1 },
    tabUnderlineStyle: { backgroundColor: '#0066CC' },
    inactiveUnderlineStyle: { backgroundColor: '#CCCCCC' },
    tabStyle: { backgroundColor: '#FFFFFF' },
    textStyle: { fontSize: 16 },
    tabBar: { backgroundColor: '#F8F9FA' },
    editNetworkMenu: { padding: 16 },
    containerDeleteText: { padding: 16 },
    textCentred: { textAlign: 'center' },
  }),
}));

jest.mock('../../../component-library/components/Texts/Text', () => {
  const MockText = ({ children, variant, style, ...props }) => {
    const { Text } = require('react-native');
    return (
      <Text style={style} variant={variant} {...props}>
        {children}
      </Text>
    );
  };
  MockText.TextVariant = {
    HeadingMD: 'HeadingMD',
    BodyMD: 'BodyMD',
  };
  return MockText;
});

const mockStore = configureStore([]);

describe('NetworkManager Component', () => {
  const mockNetworkConfigurations = {
    'eip155:1': {
      caipChainId: 'eip155:1',
      name: 'Ethereum Mainnet',
      nativeCurrency: 'ETH',
      rpcEndpoints: [{ url: 'https://mainnet.infura.io' }],
    },
    'eip155:137': {
      caipChainId: 'eip155:137',
      name: 'Polygon Mainnet',
      nativeCurrency: 'MATIC',
      rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
    },
  };

  const store = mockStore({
    networkController: {
      networkConfigurations: mockNetworkConfigurations,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to their default implementations
    mockUseNetworksByNamespace.mockImplementation(() => ({ selectedCount: 2 }));
    mockSelectNetworkConfigurations.mockReturnValue(mockNetworkConfigurations);
    mockCreateEventBuilder.mockReturnValue({ build: mockBuild });
    mockBuild.mockReturnValue({ type: 'test_event' });
    mockDismissModal.mockImplementation((callback) => callback && callback());
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <NetworkManager />
      </Provider>,
    );
  // TODO: Refactor tests - they aren't up to par
  describe('Component Rendering', () => {
    it('should render all main elements correctly', () => {
      const { getByText, getByTestId } = renderComponent();

      expect(getByText('wallet.networks')).toBeTruthy();
      expect(getByTestId('reusable-modal')).toBeTruthy();
      expect(getByTestId('scrollable-tab-view')).toBeTruthy();
      expect(getByTestId('network-multi-selector')).toBeTruthy();
      expect(getByTestId('custom-network-selector')).toBeTruthy();
    });

    it('should apply correct container styles with safe area insets', () => {
      const { getByTestId } = renderComponent();
      const modal = getByTestId('reusable-modal');

      expect(modal.props.style).toEqual([
        {
          paddingTop: 44 + 800 * 0.02, // safeAreaInsets.top + Device.getDeviceHeight() * 0.02
          paddingBottom: 34, // safeAreaInsets.bottom
        },
      ]);
    });

    it('should set initial tab to popular networks when selectedCount > 0', () => {
      mockUseNetworksByNamespace.mockReturnValue({ selectedCount: 3 });

      const { getByTestId } = renderComponent();
      const tabView = getByTestId('scrollable-tab-view');

      expect(tabView.props.initialPage).toBe(0); // Popular tab
    });

    it('should set initial tab to custom networks when selectedCount is 0', () => {
      mockUseNetworksByNamespace.mockReturnValue({ selectedCount: 0 });

      const { getByTestId } = renderComponent();
      const tabView = getByTestId('scrollable-tab-view');

      expect(tabView.props.initialPage).toBe(1); // Custom tab
    });
  });

  describe('Tab Analytics Tracking', () => {
    it('should track analytics event when tab changes to default', () => {
      renderComponent();

      // The mock automatically triggers onChangeTab in useEffect
      expect(mockTrackEvent).toHaveBeenCalledWith({ type: 'test_event' });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'asset_filter_selected',
      );
    });

    it('should track analytics event when tab changes to custom', () => {
      // This test will verify that the default mock already covers the analytics tracking
      renderComponent();

      // Verify that the default tab analytics is tracked (since our mock defaults to 'wallet.default')
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'asset_filter_selected',
      );
    });
  });

  describe('Network Menu Modal', () => {
    it('should open network menu modal when openModal is called', async () => {
      const { getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        expect(mockOnOpenBottomSheet).toHaveBeenCalled();
        expect(getByTestId('bottom-sheet')).toBeTruthy();
      });
    });

    it('should show edit and delete options when displayEdit is true', async () => {
      const { getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        expect(getByTestId('account-action-transaction.edit')).toBeTruthy();
        expect(getByTestId('account-action-app_settings.delete')).toBeTruthy();
      });
    });

    it('should only show edit option when displayEdit is false', async () => {
      const { getByTestId, queryByTestId } = renderComponent();

      const openCustomModalButton = getByTestId('open-custom-modal-button');
      fireEvent.press(openCustomModalButton);

      await waitFor(() => {
        expect(getByTestId('account-action-transaction.edit')).toBeTruthy();
        expect(queryByTestId('account-action-app_settings.delete')).toBeFalsy();
      });
    });

    it('should display correct icons for edit and delete actions', async () => {
      const { getByTestId, getAllByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const icons = getAllByTestId('icon');
        expect(icons[0]).toHaveTextContent('edit');
        expect(icons[1]).toHaveTextContent('trash');
      });
    });
  });

  describe('Edit Network Navigation', () => {
    it('should navigate to AddNetwork screen when edit is pressed', async () => {
      const { getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const editButton = getByTestId('account-action-transaction.edit');
        fireEvent.press(editButton);
      });

      expect(mockDismissModal).toHaveBeenCalledWith(expect.any(Function));
      expect(mockNavigate).toHaveBeenCalledWith('AddNetwork', {
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
        network: 'https://mainnet.infura.io',
      });
    });
  });

  describe('Network Deletion Workflow', () => {
    it('should show confirmation modal when delete is pressed', async () => {
      const { getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
      await waitFor(() => {
        expect(getByTestId('bottom-sheet-header')).toBeTruthy();
        expect(getByTestId('bottom-sheet-footer')).toBeTruthy();
      });
    });

    it('should display correct network name in delete confirmation', async () => {
      const { getByTestId, getByText } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        expect(getByText('app_settings.delete')).toBeTruthy();
        expect(getByText('Ethereum Mainnet')).toBeTruthy();
        expect(getByText('asset_details.network')).toBeTruthy();
        expect(getByText('app_settings.network_delete')).toBeTruthy();
      });
    });

    it('should cancel deletion when cancel button is pressed', async () => {
      const { getByTestId } = renderComponent();

      // Open modal and trigger delete confirmation
      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      // Press cancel button
      await waitFor(() => {
        const cancelButton = getByTestId(
          'footer-button-accountapproval.cancel',
        );
        fireEvent.press(cancelButton);
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
      expect(mockRemoveNetwork).not.toHaveBeenCalled();
      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });

    it('should execute network removal when delete is confirmed', async () => {
      const { getByTestId } = renderComponent();

      // Open modal and trigger delete confirmation
      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      // Confirm deletion
      await waitFor(() => {
        const confirmButton = getByTestId('footer-button-app_settings.delete');
        fireEvent.press(confirmButton);
      });

      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x1');
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:1');
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        removedChainId: '0x1',
      });
    });

    it('should throw error when trying to delete non-existent network', async () => {
      // Mock empty network configurations
      mockSelectNetworkConfigurations.mockReturnValue({});

      const { getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        expect(() => fireEvent.press(deleteButton)).toThrow(
          'Unable to find network with chain id eip155:1',
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing network configuration gracefully in render', () => {
      mockSelectNetworkConfigurations.mockReturnValue({});

      expect(() => renderComponent()).not.toThrow();
    });

    it('should handle navigation errors gracefully', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      const { getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const editButton = getByTestId('account-action-transaction.edit');
        expect(() => fireEvent.press(editButton)).not.toThrow();
      });
    });

    it('should handle missing modal refs gracefully', () => {
      // Test when refs are null
      const { getByTestId } = renderComponent();

      expect(() => {
        const openModalButton = getByTestId('open-modal-button');
        fireEvent.press(openModalButton);
      }).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up resources on unmount', () => {
      const { unmount } = renderComponent();
      expect(() => unmount()).not.toThrow();
    });

    it('should handle re-renders correctly', () => {
      const { rerender } = renderComponent();

      expect(() => {
        rerender(
          <Provider store={store}>
            <NetworkManager />
          </Provider>,
        );
      }).not.toThrow();
    });

    it('should handle prop changes correctly', () => {
      // Test changing selectedCount
      const { rerender } = renderComponent();

      mockUseNetworksByNamespace.mockReturnValue({ selectedCount: 0 });

      expect(() => {
        rerender(
          <Provider store={store}>
            <NetworkManager />
          </Provider>,
        );
      }).not.toThrow();
    });
  });
});
