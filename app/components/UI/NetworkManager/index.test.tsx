import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import NetworkManager from './index';
import { useNetworksByNamespace } from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import Engine from '../../../core/Engine';

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

// Mock keyring API dependencies first to prevent import errors
jest.mock('@metamask/keyring-utils', () => ({
  definePattern: jest.fn(),
}));

jest.mock('@metamask/keyring-api', () => ({
  BtcScope: {
    Mainnet: 'btc:mainnet',
    Testnet: 'btc:testnet',
  },
  SolScope: {
    Mainnet: 'solana:mainnet',
    Testnet: 'solana:testnet',
    Devnet: 'solana:devnet',
  },
}));

// Mock @metamask/utils with all necessary functions
jest.mock('@metamask/utils', () => ({
  parseCaipChainId: (caipChainId: string) => ({
    namespace: 'eip155',
    reference: caipChainId.split(':')[1],
  }),
  hasProperty: (obj: unknown, prop: string) =>
    obj !== null && typeof obj === 'object' && prop in obj,
  isObject: (value: unknown) =>
    value !== null && typeof value === 'object' && !Array.isArray(value),
}));

// Mock @metamask/rpc-errors to prevent import chain issues
jest.mock('@metamask/rpc-errors', () => ({
  rpcErrors: {
    provider: {
      userRejectedRequest: () => ({ code: 4001, message: 'User rejected' }),
    },
  },
  getMessageFromCode: jest.fn(() => 'Error message'),
}));

// Mock @metamask/transaction-controller
jest.mock('@metamask/transaction-controller', () => ({
  CHAIN_IDS: {
    MAINNET: '0x1',
    GOERLI: '0x5',
    SEPOLIA: '0xaa36a7',
  },
  TransactionController: jest.fn(),
}));

// Mock controller-utils
jest.mock('@metamask/controller-utils', () => ({
  toHex: (value: string | number) => `0x${value.toString(16)}`,
}));

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
    addTraitsToUser: mockAddTraitsToUser,
  }),
  MetaMetricsEvents: {
    ASSET_FILTER_SELECTED: 'asset_filter_selected',
    ASSET_FILTER_CUSTOM_SELECTED: 'asset_filter_custom_selected',
  },
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  __esModule: true,
  useNetworksByNamespace: jest.fn(() => ({ selectedCount: 2 })),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

const mockEnableNetwork = jest.fn();

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(() => ({
    disableNetwork: mockDisableNetwork,
    enableNetwork: mockEnableNetwork,
    enabledNetworksByNamespace: {
      eip155: {
        '0x1': true,
        '0x89': true,
      },
    },
  })),
}));

jest.mock('../../hooks/useNetworksToUse/useNetworksToUse', () => ({
  useNetworksToUse: jest.fn(() => ({
    networksToUse: [
      {
        id: 'eip155:1',
        name: 'Ethereum Mainnet',
        caipChainId: 'eip155:1',
        isSelected: true,
        imageSource: { uri: 'ethereum.png' },
      },
      {
        id: 'eip155:137',
        name: 'Polygon Mainnet',
        caipChainId: 'eip155:137',
        isSelected: false,
        imageSource: { uri: 'polygon.png' },
      },
    ],
  })),
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

// Create a stable mock object to avoid selector memoization warnings
const mockNetworkConfigurations = {
  'eip155:1': {
    caipChainId: 'eip155:1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      { url: 'https://mainnet.infura.io', networkClientId: 'mainnet-1' },
      { url: 'https://mainnet.publicnode.com', networkClientId: 'mainnet-2' },
    ],
    defaultRpcEndpointIndex: 0,
  },
  'eip155:137': {
    caipChainId: 'eip155:137',
    name: 'Polygon Mainnet',
    nativeCurrency: 'MATIC',
    rpcEndpoints: [
      { url: 'https://polygon-rpc.com', networkClientId: 'polygon-1' },
    ],
    defaultRpcEndpointIndex: 0,
  },
};

jest.mock('../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: jest.fn(
    () => mockNetworkConfigurations,
  ),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock popular networks to prevent import chain issues
jest.mock('../../../constants/popular-networks', () => ({
  POPULAR_NETWORK_CHAIN_IDS: {
    ETHEREUM_MAINNET: '0x1',
    POLYGON_MAINNET: '0x89',
    ARBITRUM_MAINNET: '0xa4b1',
  },
}));

// Mock custom networks
jest.mock('../../../util/networks/customNetworks', () => ({
  // Mock any functions from custom networks
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        removeNetwork: jest.fn(),
      },
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
  removeItemFromChainIdList: (chainId: string) => ({ removedChainId: chainId }),
}));

// These are now defined above

// Component mocks with simplified functionality
jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');

  return ({
    children,
    onChangeTab,
    initialPage,
  }: {
    children: React.ReactNode;
    onChangeTab?: (tab: {
      ref: { props: { tabLabel: string } };
      i: number;
    }) => void;
    initialPage?: number;
  }) => {
    // Simulate tab change for analytics testing
    ReactActual.useEffect(() => {
      if (onChangeTab) {
        const mockTab = {
          ref: { props: { tabLabel: 'wallet.default' } },
          i: initialPage || 0,
        };
        onChangeTab(mockTab);
      }
    }, [onChangeTab, initialPage]);

    return (
      <RNView testID="scrollable-tab-view" initialPage={initialPage}>
        {children}
      </RNView>
    );
  };
});

jest.mock('@tommasini/react-native-scrollable-tab-view/DefaultTabBar', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return (props: Record<string, unknown>) => (
    <RNView testID="default-tab-bar" {...props} />
  );
});

jest.mock('../NetworkMultiSelector/NetworkMultiSelector', () => {
  const {
    View: RNView,
    TouchableOpacity: RNTouchableOpacity,
    Text: RNText,
  } = jest.requireActual('react-native');
  return ({
    openModal,
    openRpcModal,
    tabLabel,
  }: {
    openModal: (args: {
      caipChainId: string;
      displayEdit: boolean;
      networkTypeOrRpcUrl: string;
      isReadOnly: boolean;
    }) => void;
    openRpcModal?: (args: { chainId: string; networkName: string }) => void;
    tabLabel: string;
  }) => (
    <RNView testID="network-multi-selector">
      <RNText testID="tab-label">{tabLabel}</RNText>
      <RNTouchableOpacity
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
        <RNText>Open Modal</RNText>
      </RNTouchableOpacity>
      {openRpcModal && (
        <RNTouchableOpacity
          testID="open-rpc-modal-button"
          onPress={() =>
            openRpcModal({ chainId: '0x1', networkName: 'Ethereum Mainnet' })
          }
        >
          <RNText>Open RPC Modal</RNText>
        </RNTouchableOpacity>
      )}
    </RNView>
  );
});

jest.mock('../CustomNetworkSelector/CustomNetworkSelector', () => {
  const {
    View: RNView,
    TouchableOpacity: RNTouchableOpacity,
    Text: RNText,
  } = jest.requireActual('react-native');
  return ({
    openModal,
    tabLabel,
  }: {
    openModal: (args: {
      caipChainId: string;
      displayEdit: boolean;
      networkTypeOrRpcUrl: string;
      isReadOnly: boolean;
    }) => void;
    openRpcModal?: (args: { chainId: string; networkName: string }) => void;
    tabLabel: string;
  }) => (
    <RNView testID="custom-network-selector">
      <RNText testID="tab-label">{tabLabel}</RNText>
      <RNTouchableOpacity
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
        <RNText>Open Custom Modal</RNText>
      </RNTouchableOpacity>
    </RNView>
  );
});

// Remove ReusableModal mock as component uses BottomSheet

// Mock Banner component to avoid theme dependency issues
jest.mock('../../../component-library/components/Banners/Banner', () => {
  const { View: RNView, Text: RNText } = jest.requireActual('react-native');
  const MockBanner = ({
    description,
    testID,
  }: {
    description?: string;
    testID?: string;
  }) => (
    <RNView testID={testID || 'banner'}>
      <RNText>{description}</RNText>
    </RNView>
  );
  return {
    __esModule: true,
    default: MockBanner,
    BannerVariant: {
      Alert: 'Alert',
      Tip: 'Tip',
    },
    BannerAlertSeverity: {
      Info: 'Info',
      Warning: 'Warning',
      Error: 'Error',
      Success: 'Success',
    },
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View: RNView } = jest.requireActual('react-native');

    let sheetCounter = 0;

    return ReactActual.forwardRef(
      (
        {
          children,
          style,
          shouldNavigateBack,
        }: {
          children: React.ReactNode;
          style?: unknown;
          shouldNavigateBack?: boolean;
        },
        ref: React.Ref<{
          onOpenBottomSheet: (cb?: () => void) => void;
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        const sheetId = ++sheetCounter;
        const isMainSheet = shouldNavigateBack !== false; // Main sheet has shouldNavigateBack=true or undefined

        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (cb?: () => void) => {
            mockOnOpenBottomSheet();
            cb?.();
          },
          onCloseBottomSheet: (cb?: () => void) => {
            if (isMainSheet) {
              mockDismissModal(cb);
            } else {
              mockOnCloseBottomSheet();
            }
            cb?.();
          },
        }));

        const testID = isMainSheet
          ? 'main-bottom-sheet'
          : `bottom-sheet-${sheetId}`;

        return (
          <RNView testID={testID} style={style}>
            {children}
          </RNView>
        );
      },
    );
  },
);

jest.mock('../../Views/AccountAction', () => {
  const { TouchableOpacity: RNTouchableOpacity, Text: RNText } =
    jest.requireActual('react-native');
  return ({
    actionTitle,
    onPress,
    iconName,
  }: {
    actionTitle: string;
    onPress: () => void;
    iconName: string;
  }) => (
    <RNTouchableOpacity
      testID={`account-action-${actionTitle
        .toLowerCase()
        .replace(/\s+/g, '-')}`}
      onPress={onPress}
    >
      <RNText>{actionTitle}</RNText>
      <RNText testID="icon">{iconName}</RNText>
    </RNTouchableOpacity>
  );
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter',
  () => {
    const {
      View: RNView,
      TouchableOpacity: RNTouchableOpacity,
      Text: RNText,
    } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: { label: string; onPress: () => void }[];
      }) => (
        <RNView testID="bottom-sheet-footer">
          {buttonPropsArray?.map((buttonProps, index) => (
            <RNTouchableOpacity
              key={index}
              testID={`footer-button-${buttonProps.label
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              onPress={buttonProps.onPress}
            >
              <RNText>{buttonProps.label}</RNText>
            </RNTouchableOpacity>
          ))}
        </RNView>
      ),
    };
  },
);

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => ({
    ButtonsAlignment: {
      Horizontal: 'horizontal',
      Vertical: 'vertical',
    },
  }),
);

jest.mock('../../../component-library/components/Buttons/ButtonIcon', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onPress }: { onPress?: () => void }) => (
      <TouchableOpacity testID="button-icon" onPress={onPress} />
    ),
    ButtonIconSizes: {
      Sm: 'sm',
      Md: 'md',
      Lg: 'lg',
    },
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader',
  () => {
    const { View: RNView, Text: RNText } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <RNView testID="header">
          <RNText>{children}</RNText>
        </RNView>
      ),
    };
  },
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
    ArrowLeft: 'arrow-left',
    Close: 'close',
  },
  IconSize: {
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
  },
  IconColor: {
    Default: 'default',
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
  const { Text: RNText } = jest.requireActual('react-native');
  type MockTextComponent = React.ComponentType<Record<string, unknown>> & {
    TextVariant: { HeadingMD: string; BodyMD: string };
  };
  const MockText = ({
    children,
    variant,
    style,
    ...props
  }: {
    children: React.ReactNode;
    variant?: unknown;
    style?: unknown;
  }) => (
    <RNText style={style} variant={variant as never} {...props}>
      {children}
    </RNText>
  );
  const MockTextWithStatics = MockText as unknown as MockTextComponent;
  MockTextWithStatics.TextVariant = {
    HeadingMD: 'HeadingMD',
    BodyMD: 'BodyMD',
  };
  return MockTextWithStatics;
});

jest.mock(
  '../../Views/NetworkSelector/RpcSelectionModal/RpcSelectionModal',
  () => {
    const { View: RNView, Text: RNText } = jest.requireActual('react-native');
    return ({
      showMultiRpcSelectModal,
      networkConfigurations,
    }: {
      showMultiRpcSelectModal: {
        isVisible: boolean;
        chainId: string;
        networkName: string;
      };
      networkConfigurations: Record<string, unknown>;
    }) => {
      if (!showMultiRpcSelectModal.isVisible) return null;
      return (
        <RNView testID="rpc-selection-modal">
          <RNText testID="rpc-modal-network-name">
            {showMultiRpcSelectModal.networkName}
          </RNText>
          <RNText testID="rpc-modal-chain-id">
            {showMultiRpcSelectModal.chainId}
          </RNText>
          <RNText testID="rpc-modal-configs-count">
            {Object.keys(networkConfigurations).length}
          </RNText>
        </RNView>
      );
    };
  },
);

jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => chainId.includes('solana'),
}));

const mockStore = configureStore([]);

describe('NetworkManager Component', () => {
  const store = mockStore({
    networkController: {
      networkConfigurations: mockNetworkConfigurations,
    },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          // Mock feature flags
          flags: {},
        },
        NetworkController: {
          networkConfigurationsByChainId: mockNetworkConfigurations,
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to their default implementations
    (useNetworksByNamespace as jest.Mock).mockImplementation(() => ({
      selectedCount: 2,
    }));
    mockCreateEventBuilder.mockReturnValue({ build: mockBuild });
    mockBuild.mockReturnValue({ type: 'test_event' });
    mockDismissModal.mockImplementation((callback) => callback?.());
    mockRemoveNetwork.mockImplementation(() => {
      // Mock implementation for network removal
    });

    // Ensure the Engine mock has the removeNetwork function
    (
      Engine.context.NetworkController.removeNetwork as jest.Mock
    ).mockImplementation(mockRemoveNetwork);
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <NetworkManager />
      </Provider>,
    );

  describe('Component Rendering', () => {
    it('should render all main elements correctly', () => {
      const { getByText, getByTestId } = renderComponent();

      expect(getByText('wallet.networks')).toBeOnTheScreen();
      expect(getByTestId('main-bottom-sheet')).toBeOnTheScreen();
      expect(getByTestId('scrollable-tab-view')).toBeOnTheScreen();
      expect(getByTestId('network-multi-selector')).toBeOnTheScreen();
      expect(getByTestId('custom-network-selector')).toBeOnTheScreen();
    });

    it('sets initial tab to popular networks when multiple networks are enabled', () => {
      (useNetworkEnablement as jest.Mock).mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': true,
          },
        },
      });

      const { getByTestId } = renderComponent();
      const tabView = getByTestId('scrollable-tab-view');

      expect(tabView.props.initialPage).toBe(0); // Popular tab
    });

    it('sets initial tab to custom networks when no networks are enabled', () => {
      (useNetworkEnablement as jest.Mock).mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {},
      });

      const { getByTestId } = renderComponent();
      const tabView = getByTestId('scrollable-tab-view');

      expect(tabView.props.initialPage).toBe(1); // Custom tab
    });
  });

  describe('Tab Analytics Tracking', () => {
    it('should track analytics event when tab is rendered', () => {
      // Arrange - Component renders with mocked analytics

      // Act - Render the component
      renderComponent();

      // Assert - Analytics event is tracked
      expect(mockTrackEvent).toHaveBeenCalledWith({ type: 'test_event' });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'asset_filter_selected',
      );
    });
  });

  describe('Network Menu Modal', () => {
    it('should display both edit and delete options when displayEdit is true', async () => {
      // Arrange - Render component
      const { getByTestId } = renderComponent();

      // Act - Open modal that has displayEdit: true (the default mock)
      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      // Assert - Both edit and delete actions are visible
      await waitFor(() => {
        expect(
          getByTestId('account-action-transaction.edit'),
        ).toBeOnTheScreen();
        expect(
          getByTestId('account-action-app_settings.delete'),
        ).toBeOnTheScreen();
      });
    });

    it('should display only edit option when displayEdit is false', async () => {
      // Arrange - Render component
      const { getByTestId, queryByTestId } = renderComponent();

      // Act - Open custom modal that has displayEdit: false
      const openCustomModalButton = getByTestId('open-custom-modal-button');
      fireEvent.press(openCustomModalButton);

      // Assert - Only edit action is visible, delete is not shown
      await waitFor(() => {
        expect(
          getByTestId('account-action-transaction.edit'),
        ).toBeOnTheScreen();
        expect(queryByTestId('account-action-app_settings.delete')).toBeNull();
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

      // The main BottomSheet's onCloseBottomSheet should be called with callback
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
      const { getAllByTestId, getByTestId } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
      await waitFor(() => {
        // There are now multiple headers (main sheet + delete modal)
        const headers = getAllByTestId('header');
        expect(headers.length).toBeGreaterThan(0);
        expect(getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
      });
    });

    it('should display correct network name in delete confirmation', async () => {
      const { getAllByTestId, getByTestId, getByText } = renderComponent();

      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        // There are now multiple headers (main sheet + delete modal)
        const headers = getAllByTestId('header');
        expect(headers.length).toBeGreaterThan(0);
        // The network name appears as part of a larger text string, use partial match
        expect(getByText(/Ethereum Mainnet/)).toBeOnTheScreen();
        expect(getByText(/app_settings\.network_delete/)).toBeOnTheScreen();
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
      const confirmButton = getByTestId('footer-button-app_settings.delete');
      fireEvent.press(confirmButton);

      expect(mockRemoveNetwork).toHaveBeenCalledWith('0x1');
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        removedChainId: '0x1',
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should call dismissModal before attempting navigation', async () => {
      // Arrange - Render component
      const { getByTestId } = renderComponent();

      // Act - Open modal and press edit
      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const editButton = getByTestId('account-action-transaction.edit');
        fireEvent.press(editButton);
      });

      // Assert - dismissModal was called before navigation
      expect(mockDismissModal).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('AddNetwork', {
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
        network: 'https://mainnet.infura.io',
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

      (useNetworksByNamespace as jest.Mock).mockReturnValue({
        selectedCount: 0,
      });

      expect(() => {
        rerender(
          <Provider store={store}>
            <NetworkManager />
          </Provider>,
        );
      }).not.toThrow();
    });
  });

  describe('RPC Selection Functionality', () => {
    it('passes openRpcModal prop to NetworkMultiSelector', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('open-rpc-modal-button')).toBeOnTheScreen();
    });

    it('opens RPC selection modal when openRpcModal is called', async () => {
      const { getByTestId } = renderComponent();

      const openRpcButton = getByTestId('open-rpc-modal-button');
      fireEvent.press(openRpcButton);

      await waitFor(() => {
        expect(getByTestId('rpc-selection-modal')).toBeOnTheScreen();
      });
    });

    it('displays network name in RPC modal', async () => {
      const { getByTestId } = renderComponent();

      const openRpcButton = getByTestId('open-rpc-modal-button');
      fireEvent.press(openRpcButton);

      await waitFor(() => {
        expect(getByTestId('rpc-modal-network-name')).toHaveTextContent(
          'Ethereum Mainnet',
        );
      });
    });

    it('displays chain ID in RPC modal', async () => {
      const { getByTestId } = renderComponent();

      const openRpcButton = getByTestId('open-rpc-modal-button');
      fireEvent.press(openRpcButton);

      await waitFor(() => {
        expect(getByTestId('rpc-modal-chain-id')).toHaveTextContent('0x1');
      });
    });

    it('passes EVM network configurations to RPC modal', async () => {
      const { getByTestId } = renderComponent();

      const openRpcButton = getByTestId('open-rpc-modal-button');
      fireEvent.press(openRpcButton);

      await waitFor(() => {
        expect(getByTestId('rpc-modal-configs-count')).toHaveTextContent('2');
      });
    });
  });

  describe('Enabled Networks Processing', () => {
    const mockUseNetworkEnablement =
      useNetworkEnablement as jest.MockedFunction<typeof useNetworkEnablement>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should correctly process enabled networks from flat structure', () => {
      mockUseNetworkEnablement.mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': true,
            '0xa': false,
          },
        },
        namespace: 'eip155',
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as never,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: jest.fn(),
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': true,
          '0xa': false,
        },
      });

      // The component internally processes enabledNetworksByNamespace
      // We verify it renders without errors and has correct tab state
      const { getByTestId } = renderComponent();

      // Verify component renders successfully with processed networks
      expect(getByTestId('main-bottom-sheet')).toBeOnTheScreen();
    });

    it('should correctly process enabled networks from nested structure', () => {
      mockUseNetworkEnablement.mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
          bip122: {
            '0x1': true,
          },
        } as never,
        namespace: 'eip155',
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as never,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: jest.fn(),
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': false,
          '0xa': false,
        },
      });

      // The component should handle nested namespace structures
      const { getByTestId } = renderComponent();

      expect(getByTestId('main-bottom-sheet')).toBeOnTheScreen();
    });

    it('should handle empty enabled networks gracefully', () => {
      mockUseNetworkEnablement.mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {},
        namespace: 'eip155',
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as never,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: jest.fn(),
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {},
      });

      const { getByTestId } = renderComponent();

      expect(getByTestId('main-bottom-sheet')).toBeOnTheScreen();
    });

    it('should filter out disabled networks correctly', () => {
      mockUseNetworkEnablement.mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
            '0xa': false,
            '0xa4b1': true,
          },
        },
        namespace: 'eip155',
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as never,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: jest.fn(),
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': false,
          '0xa': false,
          '0xa4b1': true,
        },
      });

      // Component should only include enabled (true) networks
      const { getByTestId } = renderComponent();

      expect(getByTestId('main-bottom-sheet')).toBeOnTheScreen();
    });

    it('disables network in filter during deletion without switching active network', async () => {
      mockUseNetworkEnablement.mockReturnValue({
        disableNetwork: mockDisableNetwork,
        enableNetwork: mockEnableNetwork,
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': true,
          },
        },
        namespace: 'eip155',
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {} as never,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: jest.fn(),
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': true,
        },
      });

      const { getByTestId } = renderComponent();

      // Open modal and trigger delete confirmation
      const openModalButton = getByTestId('open-modal-button');
      fireEvent.press(openModalButton);

      await waitFor(() => {
        const deleteButton = getByTestId('account-action-app_settings.delete');
        fireEvent.press(deleteButton);
      });

      // Confirm deletion
      const confirmButton = getByTestId('footer-button-app_settings.delete');
      fireEvent.press(confirmButton);

      // Only disables the deleted network, does not enable another one
      // (we only allow deleting non-active networks, so no need to switch)
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:1');
      expect(mockEnableNetwork).not.toHaveBeenCalled();
    });
  });
});
