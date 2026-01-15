import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseCaipChainId, CaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { debounce, type DebouncedFunc } from 'lodash';
import { useStyles } from '../../../component-library/hooks/index.ts';
import { isTestNet } from '../../../util/networks/index.js';
import { selectEvmChainId } from '../../../selectors/networkController';
import {
  selectSelectedNonEvmNetworkChainId,
  selectIsEvmNetworkSelected,
} from '../../../selectors/multichainNetworkController';
import NetworkMultiSelectorList from './NetworkMultiSelectorList';
import {
  NetworkMultiSelectorListProps,
  Network,
} from './NetworkMultiSelectorList.types.ts';

// Mock all dependencies
jest.mock('@metamask/transaction-controller', () => ({
  CHAIN_IDS: {
    MAINNET: '0x1',
    LINEA_MAINNET: '0xe708',
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
}));

jest.mock('lodash', () => ({
  debounce: jest.fn(
    (
      fn: (...args: unknown[]) => unknown,
      _wait?: number,
      _options?: unknown,
    ) => {
      const debouncedFn = ((...args: unknown[]) =>
        fn(...args)) as DebouncedFunc<(...args: unknown[]) => unknown>;
      debouncedFn.cancel = jest.fn();
      debouncedFn.flush = jest.fn(() => fn());
      return debouncedFn;
    },
  ),
}));

jest.mock('../../../component-library/hooks/index.ts', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      networkList: {},
    },
  })),
}));

jest.mock('../../../util/networks/index.js', () => ({
  isTestNet: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
  selectSelectedNonEvmNetworkChainId: jest.fn(),
}));

jest.mock('../../../util/hideProtocolFromUrl', () =>
  jest.fn((url: string) => url.replace(/^https?:\/\//, '')),
);

jest.mock('../../../util/hideKeyFromUrl', () =>
  jest.fn((url: string) => url.replace(/\/[a-zA-Z0-9]{32,}$/, '')),
);

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts/index.ts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

jest.mock('../../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsRemoteFeatureEnabled: jest.fn(),
  MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1: 'v1',
  MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2: 'v2',
}));

jest.mock('@metamask/utils', () => ({
  KnownCaipNamespace: { Eip155: 'eip155' },
  parseCaipChainId: jest.fn(),
  CaipChainId: jest.fn(),
  hasProperty: jest.fn(),
}));

jest.mock('@metamask/rpc-errors', () => ({
  rpcErrors: {},
  serializeError: jest.fn(),
}));

// Mock component library components
jest.mock('../../../component-library/components/Cells/Cell/index.ts', () => {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const MockCell = function MockCell(props: Record<string, unknown>) {
    return ReactMock.createElement('View', {
      testID: 'mock-cell',
      ...props,
    });
  };

  return {
    default: MockCell,
    CellVariant: {
      MultiSelectWithMenu: 'MultiSelectWithMenu',
    },
  };
});

jest.mock('../../../component-library/components/Icons/Icon/index.ts', () => ({
  IconName: {
    MoreVertical: 'MoreVertical',
  },
}));

jest.mock(
  '../../../component-library/components/Avatars/Avatar/index.ts',
  () => ({
    AvatarSize: {
      Sm: 'sm',
    },
    AvatarVariant: {
      Network: 'network',
    },
  }),
);

jest.mock('@shopify/flash-list', () => {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const MockFlashList = function MockFlashList(props: Record<string, unknown>) {
    return ReactMock.createElement('View', {
      testID: 'mock-flash-list',
      ...props,
    });
  };
  return {
    FlashList: MockFlashList,
    ListRenderItem: jest.fn(),
  };
});

describe('NetworkMultiSelectorList', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseSafeAreaInsets = useSafeAreaInsets as jest.MockedFunction<
    typeof useSafeAreaInsets
  >;
  const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
    typeof parseCaipChainId
  >;
  const mockToHex = toHex as jest.MockedFunction<typeof toHex>;
  const mockFormatChainIdToCaip = formatChainIdToCaip as jest.MockedFunction<
    typeof formatChainIdToCaip
  >;
  const mockDebounce = debounce as jest.MockedFunction<typeof debounce>;
  const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;
  const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
  const mockSelectEvmChainId = selectEvmChainId as jest.MockedFunction<
    typeof selectEvmChainId
  >;
  const mockSelectSelectedNonEvmNetworkChainId =
    selectSelectedNonEvmNetworkChainId as jest.MockedFunction<
      typeof selectSelectedNonEvmNetworkChainId
    >;
  const mockSelectIsEvmNetworkSelected =
    selectIsEvmNetworkSelected as jest.MockedFunction<
      typeof selectIsEvmNetworkSelected
    >;

  const mockOnSelectNetwork = jest.fn();
  const mockOpenModal = jest.fn();
  const mockRenderRightAccessory = jest.fn();
  const mockOpenRpcModal = jest.fn();

  const mockNetworks: Network[] = [
    {
      id: 'eip155:1',
      name: 'Ethereum Mainnet',
      isSelected: true,
      imageSource: { uri: 'ethereum.png' },
      caipChainId: 'eip155:1' as CaipChainId,
      networkTypeOrRpcUrl: 'https://mainnet.infura.io/v3/abc123',
      hasMultipleRpcs: true,
    },
    {
      id: 'eip155:137',
      name: 'Polygon',
      isSelected: false,
      imageSource: { uri: 'polygon.png' },
      caipChainId: 'eip155:137' as CaipChainId,
      networkTypeOrRpcUrl: 'https://polygon-rpc.com',
      hasMultipleRpcs: false,
    },
    {
      id: 'eip155:80001',
      name: 'Mumbai Testnet',
      isSelected: false,
      imageSource: { uri: 'mumbai.png' },
      caipChainId: 'eip155:80001' as CaipChainId,
      networkTypeOrRpcUrl: 'https://mumbai-rpc.com',
      hasMultipleRpcs: false,
    },
  ];

  const defaultProps: NetworkMultiSelectorListProps = {
    onSelectNetwork: mockOnSelectNetwork,
    networks: mockNetworks,
    openModal: mockOpenModal,
    openRpcModal: mockOpenRpcModal,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup useSelector to return different values based on the selector function
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectEvmChainId) {
        return '0x1';
      }
      if (selector === mockSelectSelectedNonEvmNetworkChainId) {
        return 'solana:mainnet';
      }
      if (selector === mockSelectIsEvmNetworkSelected) {
        return true;
      }
      // Default return for selectMultichainAccountsState2Enabled
      return false;
    });

    mockUseSafeAreaInsets.mockReturnValue({
      top: 0,
      right: 0,
      bottom: 34,
      left: 0,
    });

    mockParseCaipChainId.mockImplementation((chainId) => ({
      namespace: 'eip155',
      reference: chainId.split(':')[1],
    }));

    mockToHex.mockImplementation((value) => `0x${value}`);
    mockFormatChainIdToCaip.mockReturnValue('eip155:1');
    mockIsTestNet.mockReturnValue(false);
    mockDebounce.mockImplementation((fn: (...args: unknown[]) => unknown) => {
      const debouncedFn = ((...args: unknown[]) =>
        fn(...args)) as DebouncedFunc<(...args: unknown[]) => unknown>;
      debouncedFn.cancel = jest.fn();
      debouncedFn.flush = jest.fn(() => fn());
      return debouncedFn;
    });
  });

  // TODO: Refactor tests - they aren't up to par
  describe('basic functionality', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('calls useSafeAreaInsets', () => {
      render(<NetworkMultiSelectorList {...defaultProps} />);
      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
    });

    it('calls useSelector with selectEvmChainId', () => {
      render(<NetworkMultiSelectorList {...defaultProps} />);
      expect(mockUseSelector).toHaveBeenCalledWith(mockSelectEvmChainId);
    });

    it('calls useStyles with styleSheet', () => {
      render(<NetworkMultiSelectorList {...defaultProps} />);
      expect(mockUseStyles).toHaveBeenCalledWith(expect.any(Function), {});
    });

    it('processes networks correctly', () => {
      render(<NetworkMultiSelectorList {...defaultProps} />);

      expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
      expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:137');
      expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:80001');

      expect(mockToHex).toHaveBeenCalledWith('1');
      expect(mockToHex).toHaveBeenCalledWith('137');
      expect(mockToHex).toHaveBeenCalledWith('80001');
    });

    it('filters out test networks', () => {
      mockIsTestNet.mockImplementation((chainId) => chainId === '0x80001');

      render(<NetworkMultiSelectorList {...defaultProps} />);

      // Should only process non-test networks
      expect(mockIsTestNet).toHaveBeenCalledWith('0x1');
      expect(mockIsTestNet).toHaveBeenCalledWith('0x137');
      expect(mockIsTestNet).toHaveBeenCalledWith('0x80001');
    });
  });

  describe('additional networks component', () => {
    it('renders additional networks component when provided', () => {
      const AdditionalComponent = () =>
        React.createElement('View', { testID: 'additional-component' });
      const props = {
        ...defaultProps,
        additionalNetworksComponent: React.createElement(AdditionalComponent),
      };

      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('does not render additional networks component when not provided', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });

  describe('right accessory', () => {
    it('renders right accessory when provided', () => {
      const props = {
        ...defaultProps,
        renderRightAccessory: mockRenderRightAccessory,
      };
      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);

      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('does not render right accessory when not provided', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });

  describe('auto scroll', () => {
    it('enables auto scroll by default', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('disables auto scroll when isAutoScrollEnabled is false', () => {
      const props = { ...defaultProps, isAutoScrollEnabled: false };
      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('renders correctly when no networks are provided', () => {
      const props = { ...defaultProps, networks: [] };
      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('renders correctly when networks is undefined', () => {
      const props = { ...defaultProps, networks: undefined };
      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });

  describe('debounced selection', () => {
    it('uses debounced function for network selection', () => {
      render(<NetworkMultiSelectorList {...defaultProps} />);

      expect(mockDebounce).toHaveBeenCalledWith(expect.any(Function), 150, {
        leading: true,
        trailing: false,
      });
    });
  });

  describe('chain ID processing', () => {
    it('handles solana networks correctly', () => {
      const solanaNetwork: Network = {
        id: 'solana:101',
        name: 'Solana Mainnet',
        isSelected: false,
        imageSource: { uri: 'solana.png' },
        caipChainId: 'solana:101' as CaipChainId,
      };

      mockParseCaipChainId.mockImplementation((chainId) => ({
        namespace: chainId.split(':')[0],
        reference: chainId.split(':')[1],
      }));

      mockToHex.mockClear();
      mockUseSelector.mockClear();

      // Set useSelector to return different values based on the selector
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectEvmChainId) {
          return '0x1';
        }
        if (selector === mockSelectSelectedNonEvmNetworkChainId) {
          return 'solana:mainnet';
        }
        if (selector === mockSelectIsEvmNetworkSelected) {
          // return false for isEvmSelected
          return false;
        }
        return undefined;
      });

      const props = { ...defaultProps, networks: [solanaNetwork] };
      render(<NetworkMultiSelectorList {...props} />);

      expect(mockParseCaipChainId).toHaveBeenCalledWith('solana:101');
      // For solana networks, chainId should be empty string
      expect(mockToHex).not.toHaveBeenCalled();
    });

    it('handles ethereum networks correctly', () => {
      const ethereumNetwork: Network = {
        id: 'eip155:1',
        name: 'Ethereum Mainnet',
        isSelected: false,
        imageSource: { uri: 'ethereum.png' },
        caipChainId: 'eip155:1' as CaipChainId,
      };

      const props = { ...defaultProps, networks: [ethereumNetwork] };
      render(<NetworkMultiSelectorList {...props} />);

      expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
      expect(mockToHex).toHaveBeenCalledWith('1');
    });

    it('falls back to EVM chain ID when non-EVM chain ID is undefined', () => {
      // When isEvmSelected is false but nonEvmChainId is undefined,
      // selectedChainIdCaip should fall back to EVM chain ID to prevent
      // displayEdit from incorrectly evaluating to true for all networks
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectEvmChainId) {
          return '0x1';
        }
        if (selector === mockSelectSelectedNonEvmNetworkChainId) {
          return undefined; // Simulate undefined non-EVM chain ID
        }
        if (selector === mockSelectIsEvmNetworkSelected) {
          return false; // Non-EVM is selected, but chain ID is undefined
        }
        return undefined;
      });

      const ethereumNetwork: Network = {
        id: 'eip155:1',
        name: 'Ethereum Mainnet',
        isSelected: false,
        imageSource: { uri: 'ethereum.png' },
        caipChainId: 'eip155:1' as CaipChainId,
      };

      const props = { ...defaultProps, networks: [ethereumNetwork] };
      render(<NetworkMultiSelectorList {...props} />);

      // formatChainIdToCaip should be called with EVM chain ID as fallback
      expect(mockFormatChainIdToCaip).toHaveBeenCalledWith('0x1');
    });
  });

  describe('RPC Selection', () => {
    it('calls openRpcModal when network text is clicked', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );

      expect(getByTestId('mock-flash-list')).toBeTruthy();
      expect(mockOpenRpcModal).toBeDefined();
    });

    it('displays secondary text when network has multiple RPCs', () => {
      const networkWithMultipleRpcs: Network = {
        id: 'eip155:1',
        name: 'Ethereum Mainnet',
        isSelected: false,
        imageSource: { uri: 'ethereum.png' },
        caipChainId: 'eip155:1' as CaipChainId,
        networkTypeOrRpcUrl: 'https://mainnet.infura.io/v3/abc123',
        hasMultipleRpcs: true,
      };

      const props = {
        ...defaultProps,
        networks: [networkWithMultipleRpcs],
      };

      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);

      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('does not display secondary text when network has single RPC', () => {
      const networkWithSingleRpc: Network = {
        id: 'eip155:137',
        name: 'Polygon',
        isSelected: false,
        imageSource: { uri: 'polygon.png' },
        caipChainId: 'eip155:137' as CaipChainId,
        networkTypeOrRpcUrl: 'https://polygon-rpc.com',
        hasMultipleRpcs: false,
      };

      const props = {
        ...defaultProps,
        networks: [networkWithSingleRpc],
      };

      const { getByTestId } = render(<NetworkMultiSelectorList {...props} />);

      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });
});
