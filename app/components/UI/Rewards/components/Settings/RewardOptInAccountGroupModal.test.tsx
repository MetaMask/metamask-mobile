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
            onClose,
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
          ReactActual.createElement(View, {
            testID: `multichain-address-row-address`,
          }),
          ReactActual.createElement(View, {
            testID: `multichain-address-row-network-name`,
          }),
        ),
    };
  },
);

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
    it('renders bottom sheet container', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders header with account group name', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('renders address list', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
    });

    it('renders address items for each address', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          'flat-list-item-0x0987654321098765432109876543210987654321-eip155:1',
        ),
      ).toBeOnTheScreen();
    });

    it('does not render address list when addressData is empty', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('reward-opt-in-address-list')).toBeNull();
    });

    it('calls navigation.goBack when BottomSheet onClose is triggered', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const bottomSheet = getByTestId('bottom-sheet');
      const onClose = bottomSheet.props.onClose;

      if (onClose) {
        onClose();
      }

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Link Account Group Button', () => {
    it('renders link button when there are accounts that can opt in', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('link-account-group-button')).toBeOnTheScreen();
    });

    it('does not render link button when all accounts are opted in', () => {
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

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('link-account-group-button')).toBeNull();
    });

    it('does not render link button when all supported addresses are opted in but unsupported addresses exist', () => {
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

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('link-account-group-button')).toBeNull();
    });

    it('calls linkAccountGroup when button is pressed', async () => {
      mockLinkAccountGroup.mockResolvedValue({
        success: true,
        byAddress: {
          '0x0987654321098765432109876543210987654321': true,
        },
      });

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const linkButton = getByTestId('link-account-group-button');
      fireEvent.press(linkButton);

      await waitFor(() => {
        expect(mockLinkAccountGroup).toHaveBeenCalledWith(
          'keyring:wallet-1/ethereum',
        );
      });
    });

    it('shows loading state when linking', () => {
      mockUseLinkAccountGroup.mockReturnValue({
        linkAccountGroup: mockLinkAccountGroup,
        isLoading: true,
        isError: false,
      });

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const linkButton = getByTestId('link-account-group-button');
      expect(linkButton).toHaveProp('disabled', true);
    });

    it('updates local state after successful link', async () => {
      mockLinkAccountGroup.mockResolvedValue({
        success: true,
        byAddress: {
          '0x0987654321098765432109876543210987654321': true,
        },
      });

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const linkButton = getByTestId('link-account-group-button');
      fireEvent.press(linkButton);

      await waitFor(() => {
        expect(mockLinkAccountGroup).toHaveBeenCalled();
      });

      // Wait for the async state update to complete
      await waitFor(() => {
        expect(
          getByTestId(
            'flat-list-item-0x0987654321098765432109876543210987654321-eip155:1',
          ),
        ).toBeOnTheScreen();
      });
    });

    it('handles link failure gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress error output in test
        });
      mockLinkAccountGroup.mockRejectedValue(new Error('Link failed'));

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const linkButton = getByTestId('link-account-group-button');
      fireEvent.press(linkButton);

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
    it('resolves non-EVM network names correctly', () => {
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

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh-bip122:000000000019d6689c085ae165831e93',
        ),
      ).toBeOnTheScreen();
    });

    it('handles unknown network scopes', () => {
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

      render(<RewardOptInAccountGroupModal />);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown network for scope:',
        'unknown:network',
      );

      consoleWarnSpy.mockRestore();
    });

    it('treats addresses with undefined isSupported as supported', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: undefined,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
      expect(getByTestId('link-account-group-button')).toBeOnTheScreen();
    });
  });

  describe('Wildcard Scope Handling', () => {
    it('expands eip155:* wildcard to all EVM networks', () => {
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

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
    });

    it('expands bip122:0 wildcard to all Bitcoin networks', () => {
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

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh-bip122:000000000019d6689c085ae165831e93',
        ),
      ).toBeOnTheScreen();
    });

    it('filters out testnets when expanding EVM wildcards', () => {
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

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      // Goerli testnet should be filtered out, so no items with that network should exist
      expect(
        queryByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:5',
        ),
      ).toBeNull();
    });

    it('handles invalid CAIP scope format', () => {
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

      render(<RewardOptInAccountGroupModal />);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown network for scope:',
        'invalid',
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles wildcard scope with missing namespace', () => {
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
              scopes: [':*' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      render(<RewardOptInAccountGroupModal />);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid CAIP scope format:',
        ':*',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing account group context', () => {
      mockSelectAccountGroupById.mockReturnValue(undefined);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('bottom-sheet-header')).toBeNull();
    });

    it('handles account group context without metadata name', () => {
      mockSelectAccountGroupById.mockReturnValue({
        id: 'keyring:wallet-1/ethereum',
        scopes: [],
        keyringType: 'HD Key Tree',
        metadata: {},
      } as never);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('bottom-sheet-header')).toBeNull();
    });

    it('handles EVM chain ID conversion errors', () => {
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

      render(<RewardOptInAccountGroupModal />);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid EVM chain ID:',
        'invalid-chain-id',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles address items with valid scope', () => {
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

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
    });

    it('skips address items with missing address', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '',
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('reward-opt-in-address-list')).toBeNull();
    });

    it('skips address items with null address', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: null as unknown as string,
              hasOptedIn: false,
              scopes: ['eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('reward-opt-in-address-list')).toBeNull();
    });

    it('skips address items with empty scopes array', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: [],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('reward-opt-in-address-list')).toBeNull();
    });

    it('skips address items with null scopes', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: null as unknown as string[],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { queryByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(queryByTestId('reward-opt-in-address-list')).toBeNull();
    });

    it('skips empty scope strings', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['', 'eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
    });

    it('skips whitespace-only scope strings', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: ['   ', 'eip155:1' as CaipChainId],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
    });

    it('handles address items with multiple scopes', () => {
      mockUseRoute.mockReturnValue({
        params: {
          ...defaultRouteParams,
          addressData: [
            {
              address: '0x1234567890123456789012345678901234567890',
              hasOptedIn: false,
              scopes: [
                'eip155:1' as CaipChainId,
                'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
              ],
              isSupported: true,
            },
          ],
        },
        key: 'test-route',
        name: 'RewardOptInAccountGroupModal',
      } as never);

      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-eip155:1',
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          'flat-list-item-0x1234567890123456789012345678901234567890-bip122:000000000019d6689c085ae165831e93',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('FlatList Configuration', () => {
    it('renders FlatList with correct testID', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
    });

    it('has correct FlatList props for scrolling', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      expect(flatList).toHaveProp('showsVerticalScrollIndicator', true);
    });

    it('generates correct keys for header items', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      const keyExtractor = flatList.props.keyExtractor;

      const headerItem = { type: 'header' as const, title: 'Test Header' };
      const key = keyExtractor(headerItem, 0);

      expect(key).toBe('header-Test Header-0');
    });

    it('generates correct keys for address items', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      const keyExtractor = flatList.props.keyExtractor;

      const addressItem = {
        type: 'item' as const,
        address: '0x123',
        scope: 'eip155:1' as CaipChainId,
        hasOptedIn: false,
        networkName: 'Ethereum',
        isSupported: true,
      };
      const key = keyExtractor(addressItem, 1);

      expect(key).toBe('0x123-eip155:1-1');
    });
  });

  describe('Section Headers (Tracked/Untracked)', () => {
    it('shows section headers when there are both tracked and untracked addresses', () => {
      const { getByText } = render(<RewardOptInAccountGroupModal />);

      expect(getByText('rewards.link_account_group.tracked')).toBeOnTheScreen();
      expect(
        getByText('rewards.link_account_group.untracked'),
      ).toBeOnTheScreen();
    });

    it('shows tracked section header when all addresses are tracked', () => {
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

      const { getByText, queryByText } = render(
        <RewardOptInAccountGroupModal />,
      );

      expect(getByText('rewards.link_account_group.tracked')).toBeOnTheScreen();
      expect(queryByText('rewards.link_account_group.untracked')).toBeNull();
    });

    it('shows untracked section header when all addresses are untracked', () => {
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

      const { getByText, queryByText } = render(
        <RewardOptInAccountGroupModal />,
      );

      expect(queryByText('rewards.link_account_group.tracked')).toBeNull();
      expect(
        getByText('rewards.link_account_group.untracked'),
      ).toBeOnTheScreen();
    });

    it('shows unsupported section header for unsupported addresses', () => {
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

      const { getByText } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByText('rewards.link_account_group.unsupported'),
      ).toBeOnTheScreen();
    });

    it('shows unsupported section header when unsupported addresses exist alongside supported ones', () => {
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

      const { getByText } = render(<RewardOptInAccountGroupModal />);

      expect(
        getByText('rewards.link_account_group.unsupported'),
      ).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('has proper testIDs for all interactive elements', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
      expect(getByTestId('reward-opt-in-address-list')).toBeOnTheScreen();
      expect(getByTestId('link-account-group-button')).toBeOnTheScreen();
    });
  });

  describe('RenderItem Function', () => {
    it('renders header items correctly', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      const renderItem = flatList.props.renderItem;

      const headerItem = {
        item: { type: 'header' as const, title: 'Test Header' },
      };
      const headerComponent = renderItem(headerItem);

      expect(headerComponent).toBeTruthy();
    });

    it('returns null for items without address', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      const renderItem = flatList.props.renderItem;

      const invalidItem = {
        item: {
          type: 'item' as const,
          address: '',
          scope: 'eip155:1' as CaipChainId,
          hasOptedIn: false,
          networkName: 'Ethereum',
          isSupported: true,
        },
      };
      const result = renderItem(invalidItem);

      expect(result).toBeNull();
    });

    it('returns null for items without scope', () => {
      const { getByTestId } = render(<RewardOptInAccountGroupModal />);

      const flatList = getByTestId('reward-opt-in-address-list');
      const renderItem = flatList.props.renderItem;

      const invalidItem = {
        item: {
          type: 'item' as const,
          address: '0x123',
          scope: '' as CaipChainId,
          hasOptedIn: false,
          networkName: 'Ethereum',
          isSupported: true,
        },
      };
      const result = renderItem(invalidItem);

      expect(result).toBeNull();
    });
  });
});
