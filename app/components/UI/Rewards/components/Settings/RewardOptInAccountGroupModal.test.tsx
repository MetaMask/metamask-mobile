import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import RewardOptInAccountGroupModal from './RewardOptInAccountGroupModal';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import { CaipChainId } from '@metamask/utils';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/useLinkAccountGroup', () => ({
  useLinkAccountGroup: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

jest.mock('../../../../../util/networks', () => ({
  isTestNet: jest.fn((chainId: string) => chainId === '0x5'),
}));

// Mock useWindowDimensions
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    useWindowDimensions: jest.fn(() => ({
      width: 375,
      height: 800,
      scale: 2,
      fontScale: 1,
    })),
  };
});

// Mock the selectors directly
jest.mock('../../../../../selectors/multichainAccounts/accountTreeController');
jest.mock('../../../../../selectors/networkController');
jest.mock('../../../../../selectors/multichainNetworkController');
jest.mock('@metamask/multichain-network-controller', () => ({
  toEvmCaipChainId: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native');
  return {
    FlatList: actual.FlatList,
    ScrollView: actual.ScrollView,
  };
});

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, props, children),
    Button: ({
      children,
      onPress,
      testID,
      isLoading,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isLoading?: boolean;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID,
          disabled: isLoading,
          ...props,
        },
        ReactActual.createElement(RNText, {}, children),
      ),
    TextVariant: {
      BodyMd: 'BodyMd',
      HeadingMd: 'HeadingMd',
      HeadingSm: 'HeadingSm',
    },
    FontWeight: {
      Medium: 'medium',
    },
    ButtonVariant: {
      Primary: 'primary',
    },
    ButtonSize: {
      Lg: 'lg',
    },
  };
});

// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    const MockBottomSheet = ReactActual.forwardRef(
      (
        {
          children,
          onClose,
          ...props
        }: {
          children?: React.ReactNode;
          onClose?: () => void;
          [key: string]: unknown;
        },
        ref: React.Ref<unknown>,
      ) =>
        ReactActual.createElement(
          View,
          {
            testID: 'bottom-sheet',
            ref,
            ...props,
          },
          children,
        ),
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        children,
        ...props
      }: {
        children?: React.ReactNode;
        [key: string]: unknown;
      }) =>
        ReactActual.createElement(
          View,
          {
            testID: 'bottom-sheet-header',
            ...props,
          },
          children,
        ),
    };
  },
);

// Mock MultichainAddressRow
jest.mock(
  '../../../../../component-library/components-temp/MultichainAccounts',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      MultichainAddressRow: ({
        testID,
        address,
        chainId,
        networkName,
        ...props
      }: {
        testID?: string;
        address: string;
        chainId: string;
        networkName: string;
        [key: string]: unknown;
      }) =>
        ReactActual.createElement(
          View,
          { testID, ...props },
          ReactActual.createElement(View, { testID: `address-${address}` }),
          ReactActual.createElement(View, {
            testID: `network-${networkName}`,
          }),
        ),
    };
  },
);

// Mock RewardsInfoBanner
jest.mock('../RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      title,
      description,
      testID,
      ...props
    }: {
      title: string;
      description: string;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        { testID, ...props },
        ReactActual.createElement(Text, {}, title),
        ReactActual.createElement(Text, {}, description),
      ),
  };
});

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseLinkAccountGroup = useLinkAccountGroup as jest.MockedFunction<
  typeof useLinkAccountGroup
>;
const mockSelectAccountGroupById =
  selectAccountGroupById as jest.MockedFunction<typeof selectAccountGroupById>;
const mockSelectEvmNetworkConfigurationsByChainId =
  selectEvmNetworkConfigurationsByChainId as jest.MockedFunction<
    typeof selectEvmNetworkConfigurationsByChainId
  >;
const mockSelectNonEvmNetworkConfigurationsByChainId =
  selectNonEvmNetworkConfigurationsByChainId as jest.MockedFunction<
    typeof selectNonEvmNetworkConfigurationsByChainId
  >;
const mockToEvmCaipChainId = toEvmCaipChainId as jest.MockedFunction<
  typeof toEvmCaipChainId
>;

describe('RewardOptInAccountGroupModal', () => {
  const mockGoBack = jest.fn();
  const mockLinkAccountGroup = jest.fn();

  const defaultRouteParams = {
    accountGroupId: 'keyring:wallet-1/ethereum' as const,
    addressData: [
      {
        address: '0x1234567890123456789012345678901234567890',
        hasOptedIn: true,
        scopes: ['eip155:1' as CaipChainId],
        isSupported: true,
      },
      {
        address: '0x0987654321098765432109876543210987654321',
        hasOptedIn: false,
        scopes: ['eip155:1' as CaipChainId],
        isSupported: true,
      },
    ],
  };

  const mockAccountGroupContext = {
    id: 'keyring:wallet-1/ethereum',
    scopes: [],
    keyringType: 'HD Key Tree',
    metadata: {
      name: 'Test Account Group',
    },
  };

  const mockEvmNetworks = {
    '0x1': {
      name: 'Ethereum Mainnet',
      chainId: '0x1',
    },
    '0x5': {
      name: 'Goerli Testnet',
      chainId: '0x5',
    },
  };

  const mockNonEvmNetworks = {
    'bip122:000000000019d6689c085ae165831e93': {
      name: 'Bitcoin',
      chainId: 'bip122:000000000019d6689c085ae165831e93',
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      name: 'Solana',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useNavigation
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
      navigate: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: jest.fn(),
      isFocused: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    } as never);

    // Mock useRoute
    mockUseRoute.mockReturnValue({
      params: defaultRouteParams,
      key: 'test-route',
      name: 'RewardOptInAccountGroupModal',
    } as never);

    // Mock useLinkAccountGroup
    mockUseLinkAccountGroup.mockReturnValue({
      linkAccountGroup: mockLinkAccountGroup,
      isLoading: false,
      isError: false,
    });

    // Mock selectors directly
    mockSelectAccountGroupById.mockReturnValue(
      mockAccountGroupContext as never,
    );
    mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
      mockEvmNetworks as never,
    );
    mockSelectNonEvmNetworkConfigurationsByChainId.mockReturnValue(
      mockNonEvmNetworks as never,
    );

    // Mock toEvmCaipChainId
    mockToEvmCaipChainId.mockImplementation((chainId: `0x${string}`) => {
      const decimalChainId = parseInt(chainId, 16);
      return `eip155:${decimalChainId}` as CaipChainId;
    });

    // Mock useSelector to pass through to actual selectors
    mockUseSelector.mockImplementation((selector) => selector({} as never));
  });

  describe('Basic Rendering', () => {
    it('should render bottom sheet container', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('should render header with account group name', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('should render address list', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
    });

    it('should render address items for each address', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Check that the MultichainAddressRow components are rendered
      expect(
        getByTestId('address-0x1234567890123456789012345678901234567890'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('address-0x0987654321098765432109876543210987654321'),
      ).toBeOnTheScreen();
    });
  });

  describe('Unsupported Accounts Banner', () => {
    it('should show banner when there are unsupported accounts', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            ...defaultRouteParams.addressData,
            {
              address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: false,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(getByTestId('unsupported-accounts-banner')).toBeOnTheScreen();
    });

    it('should not show banner when all accounts are supported', () => {
      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('unsupported-accounts-banner')).toBeNull();
    });
  });

  describe('Link Account Group Button', () => {
    it('should render link button when there are accounts that can opt in', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('link-account-group-button')).toBeOnTheScreen();
    });

    it('should not render link button when all accounts are opted in', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: true,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(queryByTestId('link-account-group-button')).toBeNull();
    });

    it('should call linkAccountGroup when button is pressed', async () => {
      // Arrange
      mockLinkAccountGroup.mockResolvedValue({
        success: true,
        byAddress: {
          '0x0987654321098765432109876543210987654321': true,
        },
      });

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Act
      const linkButton = getByTestId('link-account-group-button');
      fireEvent.press(linkButton);

      // Assert
      await waitFor(() => {
        expect(mockLinkAccountGroup).toHaveBeenCalledWith(
          'keyring:wallet-1/ethereum',
        );
      });
    });

    it('should show loading state when linking', () => {
      // Arrange
      mockUseLinkAccountGroup.mockReturnValue({
        linkAccountGroup: mockLinkAccountGroup,
        isLoading: true,
        isError: false,
      });

      // Act
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert
      const linkButton = getByTestId('link-account-group-button');
      expect(linkButton).toHaveProp('disabled', true);
    });

    it('should update local state after successful link', async () => {
      // Arrange
      mockLinkAccountGroup.mockResolvedValue({
        success: true,
        byAddress: {
          '0x0987654321098765432109876543210987654321': true,
        },
      });

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Act
      const linkButton = getByTestId('link-account-group-button');
      fireEvent.press(linkButton);

      // Assert
      await waitFor(() => {
        expect(mockLinkAccountGroup).toHaveBeenCalled();
      });
    });

    it('should handle link failure gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress error output in test
        });
      mockLinkAccountGroup.mockRejectedValue(new Error('Link failed'));

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Act
      const linkButton = getByTestId('link-account-group-button');
      fireEvent.press(linkButton);

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to link account group:',
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Network Resolution', () => {
    it('should resolve non-EVM network names correctly', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
              hasOptedIn: false,
              scopes: [
                'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
              ],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(getByTestId('network-Bitcoin')).toBeOnTheScreen();
    });

    it('should handle unknown network scopes', () => {
      // Arrange
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Suppress warning output in test
        });

      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['unknown:network' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown network for scope:',
        'unknown:network',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Wildcard Scope Handling', () => {
    it('should expand eip155:* wildcard to all EVM networks', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['eip155:*' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert - Should render Ethereum Mainnet, but not Goerli testnet
      expect(getByTestId('network-Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('should expand bip122:0 wildcard to all Bitcoin networks', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
              hasOptedIn: false,
              scopes: ['bip122:0' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(getByTestId('network-Bitcoin')).toBeOnTheScreen();
    });

    it('should filter out testnets when expanding EVM wildcards', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['eip155:*' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert - Goerli testnet should not be rendered
      expect(queryByTestId('network-Goerli Testnet')).toBeNull();
    });

    it('should handle invalid CAIP scope format', () => {
      // Arrange
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Suppress warning output in test
        });

      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['invalid' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown network for scope:',
        'invalid',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing account group context', () => {
      // Arrange
      mockSelectAccountGroupById.mockReturnValue(undefined);

      // Act
      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert - Header should not render without account group name
      expect(queryByTestId('bottom-sheet-header')).toBeNull();
    });

    it('should handle EVM chain ID conversion errors', () => {
      // Arrange
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Suppress warning output in test
        });

      const invalidEvmNetworks = {
        'invalid-chain-id': {
          name: 'Invalid Network',
          chainId: 'invalid-chain-id',
        },
      };

      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
        invalidEvmNetworks as never,
      );
      mockToEvmCaipChainId.mockImplementation(() => {
        throw new Error('Invalid chain ID');
      });

      // Act
      render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid EVM chain ID:',
        'invalid-chain-id',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle address items with valid scope', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Assert - Should render the address
      expect(
        getByTestId('address-0x1234567890123456789012345678901234567890'),
      ).toBeOnTheScreen();
    });
  });

  describe('FlatList Configuration', () => {
    it('should render FlatList with correct testID', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      // Verify the FlatList is rendered
      expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
    });

    it('should have correct FlatList props for scrolling', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      expect(flatList).toHaveProp('showsVerticalScrollIndicator', true);
    });
  });

  describe('Section Headers (Tracked/Untracked)', () => {
    it('should show section headers when there are both tracked and untracked addresses', () => {
      // Arrange - default route params has both tracked and untracked addresses
      const { getByText } = render(<RewardOptInAccountGroupModal />);

      // Assert
      expect(getByText('rewards.link_account_group.tracked')).toBeOnTheScreen();
      expect(
        getByText('rewards.link_account_group.untracked'),
      ).toBeOnTheScreen();
    });

    it('should not show section headers when all addresses are tracked', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: true,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { queryByText } = render(<RewardOptInAccountGroupModal />);

      // Assert - Headers should not be rendered when there's only one type
      expect(queryByText('rewards.link_account_group.tracked')).toBeNull();
      expect(queryByText('rewards.link_account_group.untracked')).toBeNull();
    });

    it('should not show section headers when all addresses are untracked', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x0987654321098765432109876543210987654321',
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { queryByText } = render(<RewardOptInAccountGroupModal />);

      // Assert - Headers should not be rendered when there's only one type
      expect(queryByText('rewards.link_account_group.tracked')).toBeNull();
      expect(queryByText('rewards.link_account_group.untracked')).toBeNull();
    });

    it('should not show section headers for unsupported addresses', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: false,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      // Act
      const { queryByText } = render(<RewardOptInAccountGroupModal />);

      // Assert - Unsupported addresses should not be shown in the list
      expect(queryByText('rewards.link_account_group.tracked')).toBeNull();
      expect(queryByText('rewards.link_account_group.untracked')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper testIDs for all interactive elements', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
      expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
      expect(getByTestId('link-account-group-button')).toBeOnTheScreen();
    });
  });
});
