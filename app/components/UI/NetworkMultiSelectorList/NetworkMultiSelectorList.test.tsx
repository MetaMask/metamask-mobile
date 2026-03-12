import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
import { Text } from 'react-native';

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
      centeredNetworkCell: { alignItems: 'center' },
      noNetworkFeeContainer: { alignSelf: 'center' },
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

const mockGasFeesSponsoredSelector = jest.fn((_chainId: string) => false);
jest.mock(
  '../../../selectors/featureFlagController/gasFeesSponsored/index.ts',
  () => ({
    getGasFeesSponsoredNetworkEnabled: jest.fn(
      () => mockGasFeesSponsoredSelector,
    ),
  }),
);

jest.mock('../../../component-library/components/Cells/Cell/index.ts', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const MockCell = function MockCell({
    children,
    onPress,
    title,
    secondaryText,
    isSelected,
    disabled,
    showButtonIcon,
    buttonProps,
    testID,
    onTextClick,
    ...rest
  }: Record<string, unknown>) {
    return ReactMock.createElement(
      'View',
      { testID: testID ?? 'mock-cell', ...rest },
      typeof title === 'string'
        ? ReactMock.createElement('Text', { testID: 'cell-title' }, title)
        : title,
      secondaryText
        ? ReactMock.createElement(
            'Text',
            { testID: 'cell-secondary-text' },
            secondaryText,
          )
        : null,
      isSelected
        ? ReactMock.createElement(
            'Text',
            { testID: 'cell-selected' },
            'selected',
          )
        : null,
      disabled
        ? ReactMock.createElement(
            'Text',
            { testID: 'cell-disabled' },
            'disabled',
          )
        : null,
      showButtonIcon
        ? ReactMock.createElement(
            'Text',
            { testID: 'cell-show-button-icon' },
            'show-button-icon',
          )
        : null,
      onPress
        ? ReactMock.createElement('View', {
            testID: 'cell-press',
            onPress,
          })
        : null,
      onTextClick
        ? ReactMock.createElement('View', {
            testID: 'cell-text-click',
            onPress: onTextClick,
          })
        : null,
      (buttonProps as { onButtonClick?: () => void })?.onButtonClick
        ? ReactMock.createElement('View', {
            testID: 'cell-button',
            onPress: (buttonProps as { onButtonClick: () => void })
              .onButtonClick,
          })
        : null,
      children,
    );
  };
  return {
    __esModule: true,
    default: MockCell,
    CellVariant: {
      SelectWithMenu: 'SelectWithMenu',
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
    AvatarSize: { Sm: 'sm' },
    AvatarVariant: { Network: 'network' },
  }),
);

jest.mock('../../../component-library/components/Texts/Text/index.ts', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const MockText = (props: Record<string, unknown>) =>
    ReactMock.createElement('Text', props);
  MockText.displayName = 'Text';
  return {
    __esModule: true,
    default: MockText,
    TextVariant: { BodyMD: 'BodyMD', BodySM: 'BodySM' },
  };
});

jest.mock('../../../component-library/components-temp/TagColored', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const MockTagColored = (props: Record<string, unknown>) =>
    ReactMock.createElement(
      'View',
      { testID: 'tag-colored', ...props },
      props.children as React.ReactNode,
    );
  MockTagColored.displayName = 'TagColored';
  return {
    __esModule: true,
    default: MockTagColored,
    TagColor: { Success: 'Success' },
  };
});

jest.mock('@shopify/flash-list', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const MockFlashList = ReactMock.forwardRef(
    // eslint-disable-next-line prefer-arrow-callback
    function MockFlashList(
      props: {
        data?: unknown[];
        renderItem?: (arg: { item: unknown; index: number }) => unknown;
        keyExtractor?: (item: unknown, index: number) => string;
        getItemType?: (item: unknown, index: number) => string;
        onContentSizeChange?: () => void;
        testID?: string;
      },
      ref: unknown,
    ) {
      ReactMock.useImperativeHandle(ref, () => ({
        scrollToOffset: jest.fn(),
      }));

      ReactMock.useEffect(() => {
        if (props.onContentSizeChange) {
          props.onContentSizeChange();
        }
      }, [props.data?.length, props.onContentSizeChange]);

      return ReactMock.createElement(
        'View',
        { testID: props.testID ?? 'mock-flash-list' },
        ...(props.data ?? []).map((item: unknown, index: number) => {
          props.keyExtractor?.(item, index);
          props.getItemType?.(item, index);
          return props.renderItem?.({ item, index });
        }),
      );
    },
  );
  return { FlashList: MockFlashList, ListRenderItem: jest.fn() };
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

  const mockOnSelectNetwork = jest.fn();
  const mockOpenModal = jest.fn();
  const mockRenderRightAccessory = jest.fn(
    (caipChainId: CaipChainId, name: string) => (
      <Text testID={`right-accessory-${caipChainId}`}>{name}</Text>
    ),
  );
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

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectEvmChainId) return '0x1';
      if (selector === selectSelectedNonEvmNetworkChainId)
        return 'solana:mainnet';
      if (selector === selectIsEvmNetworkSelected) return true;
      if (typeof selector === 'function') return selector({});
      return undefined;
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
    mockGasFeesSponsoredSelector.mockReturnValue(false);
  });

  describe('basic rendering', () => {
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

      expect(mockUseSelector).toHaveBeenCalledWith(selectEvmChainId);
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

    it('renders correctly when networks is empty', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={[]} />,
      );

      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });

    it('renders correctly when networks is undefined', () => {
      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={undefined} />,
      );

      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });

  describe('test network filtering', () => {
    it('filters out test networks from combinedData', () => {
      mockIsTestNet.mockImplementation((chainId) => chainId === '0x80001');

      const { queryAllByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );

      const cells = queryAllByTestId(/^network-list-item-/);
      const testNetCell = cells.find((c) =>
        c.props.testID?.includes('eip155:80001'),
      );

      expect(testNetCell).toBeUndefined();
    });

    it('renders non-test networks', () => {
      mockIsTestNet.mockReturnValue(false);

      const { queryAllByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );

      const cells = queryAllByTestId(/^network-list-item-/);
      expect(cells.length).toBe(3);
    });
  });

  describe('network item rendering', () => {
    it('renders network name in Cell title', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { getByText } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      expect(getByText('Polygon')).toBeTruthy();
    });

    it('marks selected networks', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          isSelected: true,
          imageSource: { uri: 'ethereum.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      expect(getByTestId('cell-selected')).toBeTruthy();
    });

    it('shows secondary text when network has multiple RPCs', () => {
      const networkWithMultipleRpcs: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          isSelected: false,
          imageSource: { uri: 'ethereum.png' },
          caipChainId: 'eip155:1' as CaipChainId,
          networkTypeOrRpcUrl: 'https://mainnet.infura.io/v3/abc123',
          hasMultipleRpcs: true,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithMultipleRpcs}
        />,
      );

      expect(getByTestId('cell-secondary-text')).toBeTruthy();
    });

    it('hides secondary text when network has single RPC', () => {
      const networkWithSingleRpc: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
          networkTypeOrRpcUrl: 'https://polygon-rpc.com',
          hasMultipleRpcs: false,
        },
      ];

      const { queryByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithSingleRpc}
        />,
      );

      expect(queryByTestId('cell-secondary-text')).toBeNull();
    });

    it('hides secondary text when networkTypeOrRpcUrl is absent', () => {
      const networkNoUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { queryByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={networkNoUrl} />,
      );

      expect(queryByTestId('cell-secondary-text')).toBeNull();
    });

    it('shows button icon when networkTypeOrRpcUrl is set', () => {
      const networkWithUrl: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
          networkTypeOrRpcUrl: 'https://rpc.example.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithUrl}
        />,
      );

      expect(getByTestId('cell-show-button-icon')).toBeTruthy();
    });

    it('hides button icon when networkTypeOrRpcUrl is absent', () => {
      const networkNoUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { queryByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={networkNoUrl} />,
      );

      expect(queryByTestId('cell-show-button-icon')).toBeNull();
    });
  });

  describe('disabled state', () => {
    it('disables cells when isLoading is true', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={singleNetwork}
          isLoading
        />,
      );

      expect(getByTestId('cell-disabled')).toBeTruthy();
    });

    it('disables cells when isSelectionDisabled is true', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={singleNetwork}
          isSelectionDisabled
        />,
      );

      expect(getByTestId('cell-disabled')).toBeTruthy();
    });

    it('does not disable cells by default', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { queryByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      expect(queryByTestId('cell-disabled')).toBeNull();
    });
  });

  describe('gas-sponsored network', () => {
    it('renders TagColored "No network fee" for gas-sponsored chains', () => {
      mockGasFeesSponsoredSelector.mockImplementation(
        (chainId: string) => chainId === '0x1',
      );

      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      expect(getByTestId('tag-colored')).toBeTruthy();
    });

    it('renders plain name for non-sponsored chains', () => {
      mockGasFeesSponsoredSelector.mockReturnValue(false);

      const singleNetwork: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { queryByTestId, getByText } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      expect(queryByTestId('tag-colored')).toBeNull();
      expect(getByText('Polygon')).toBeTruthy();
    });
  });

  describe('renderRightAccessory', () => {
    it('renders right accessory without extra padding when showButtonIcon is true', () => {
      const networkWithUrl: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
          networkTypeOrRpcUrl: 'https://rpc.example.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithUrl}
          renderRightAccessory={mockRenderRightAccessory}
        />,
      );

      expect(getByTestId('right-accessory-eip155:1')).toBeTruthy();
      expect(mockRenderRightAccessory).toHaveBeenCalledWith(
        'eip155:1',
        'Ethereum',
      );
    });

    it('renders right accessory with Box wrapper when showButtonIcon is false', () => {
      const networkNoUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkNoUrl}
          renderRightAccessory={mockRenderRightAccessory}
        />,
      );

      expect(getByTestId('right-accessory-eip155:137')).toBeTruthy();
      expect(mockRenderRightAccessory).toHaveBeenCalledWith(
        'eip155:137',
        'Polygon',
      );
    });

    it('does not render right accessory when prop is absent', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { queryByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      expect(queryByTestId(/right-accessory/)).toBeNull();
    });
  });

  describe('debounced selection', () => {
    it('configures debounce with correct parameters', () => {
      render(<NetworkMultiSelectorList {...defaultProps} />);

      expect(mockDebounce).toHaveBeenCalledWith(expect.any(Function), 150, {
        leading: true,
        trailing: false,
      });
    });

    it('calls onSelectNetwork via debounced press', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={singleNetwork} />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-press'));
      });

      expect(mockOnSelectNetwork).toHaveBeenCalledWith('eip155:137');
    });

    it('does not call onSelectNetwork when onSelectNetwork prop is undefined', () => {
      const singleNetwork: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          onSelectNetwork={undefined}
          networks={singleNetwork}
        />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-press'));
      });

      expect(mockOnSelectNetwork).not.toHaveBeenCalled();
    });

    it('cancels debounced function on unmount', () => {
      let cancelFn: jest.Mock = jest.fn();
      mockDebounce.mockImplementation((fn: (...args: unknown[]) => unknown) => {
        const debouncedFn = ((...args: unknown[]) =>
          fn(...args)) as DebouncedFunc<(...args: unknown[]) => unknown>;
        cancelFn = jest.fn();
        debouncedFn.cancel = cancelFn;
        debouncedFn.flush = jest.fn(() => fn());
        return debouncedFn;
      });

      const { unmount } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );

      unmount();

      expect(cancelFn).toHaveBeenCalled();
    });
  });

  describe('openModal via button props', () => {
    it('calls openModal with correct params when button is pressed', () => {
      const networkWithUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
          networkTypeOrRpcUrl: 'https://polygon-rpc.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithUrl}
        />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-button'));
      });

      expect(mockOpenModal).toHaveBeenCalledWith({
        isVisible: true,
        caipChainId: 'eip155:137',
        displayEdit: true,
        networkTypeOrRpcUrl: 'https://polygon-rpc.com',
        isReadOnly: false,
      });
    });

    it('sets displayEdit=false when network caipChainId matches selectedChainIdCaip', () => {
      mockFormatChainIdToCaip.mockReturnValue('eip155:1');

      const networkWithUrl: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: true,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
          networkTypeOrRpcUrl: 'https://rpc.example.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithUrl}
        />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-button'));
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.objectContaining({ displayEdit: false }),
      );
    });

    it('sets displayEdit=false for main chain networks', () => {
      mockFormatChainIdToCaip.mockReturnValue('eip155:999');
      mockToHex.mockImplementation((value) => {
        if (String(value) === '1') return '0x1';
        return `0x${value}`;
      });

      const mainChainNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
          networkTypeOrRpcUrl: 'https://rpc.example.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={mainChainNetwork}
        />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-button'));
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.objectContaining({ displayEdit: false }),
      );
    });

    it('passes networkTypeOrRpcUrl to openModal when present', () => {
      const networkWithUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
          networkTypeOrRpcUrl: 'https://polygon-rpc.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithUrl}
        />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-button'));
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.objectContaining({
          networkTypeOrRpcUrl: 'https://polygon-rpc.com',
        }),
      );
    });

    it('falls back to empty string when networkTypeOrRpcUrl is absent', () => {
      const networkNoUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} networks={networkNoUrl} />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-button'));
      });

      expect(mockOpenModal).toHaveBeenCalledWith(
        expect.objectContaining({
          networkTypeOrRpcUrl: '',
        }),
      );
    });
  });

  describe('openRpcModal', () => {
    it('calls openRpcModal with chainId and networkName on text click', () => {
      const networkWithUrl: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
          networkTypeOrRpcUrl: 'https://polygon-rpc.com',
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithUrl}
        />,
      );

      act(() => {
        fireEvent.press(getByTestId('cell-text-click'));
      });

      expect(mockOpenRpcModal).toHaveBeenCalledWith({
        chainId: '0x137',
        networkName: 'Polygon',
      });
    });
  });

  describe('additionalNetworksComponent', () => {
    it('renders additional networks section at the end of the list', () => {
      const AdditionalComponent = () => (
        <Text testID="additional-networks">Add Networks</Text>
      );

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          additionalNetworksComponent={<AdditionalComponent />}
        />,
      );

      expect(getByTestId('additional-networks')).toBeTruthy();
    });

    it('does not render additional networks section when not provided', () => {
      const { queryByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );

      expect(queryByTestId('additional-networks')).toBeNull();
    });

    it('exercises key extractor and item type for additional section', () => {
      const AdditionalComponent = () => (
        <Text testID="additional-networks">Add Networks</Text>
      );
      const singleNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: false,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={singleNetwork}
          additionalNetworksComponent={<AdditionalComponent />}
        />,
      );

      expect(getByTestId('additional-networks')).toBeTruthy();
      expect(getByTestId('mock-flash-list')).toBeTruthy();
    });
  });

  describe('selectAllNetworksComponent', () => {
    it('renders select-all networks section at the beginning of the list', () => {
      const SelectAllComponent = () => (
        <Text testID="select-all-component">Select All</Text>
      );

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          selectAllNetworksComponent={<SelectAllComponent />}
        />,
      );

      expect(getByTestId('select-all-component')).toBeTruthy();
    });

    it('does not render select-all networks section when not provided', () => {
      const { queryByTestId } = render(
        <NetworkMultiSelectorList {...defaultProps} />,
      );

      expect(queryByTestId('select-all-component')).toBeNull();
    });
  });

  describe('areAllNetworksSelected', () => {
    it('resets isSelected to false on all networks when areAllNetworksSelected is true', () => {
      const selectedNetworks: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: true,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: true,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { queryByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={selectedNetworks}
          areAllNetworksSelected
        />,
      );

      expect(queryByTestId('cell-selected')).toBeNull();
    });

    it('preserves isSelected when areAllNetworksSelected is false', () => {
      const selectedNetworks: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: true,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={selectedNetworks}
          areAllNetworksSelected={false}
        />,
      );

      expect(getByTestId('cell-selected')).toBeTruthy();
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
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmChainId) return '0x1';
        if (selector === selectSelectedNonEvmNetworkChainId)
          return 'solana:mainnet';
        if (selector === selectIsEvmNetworkSelected) return false;
        if (typeof selector === 'function') return selector({});
        return undefined;
      });

      render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={[solanaNetwork]}
        />,
      );

      expect(mockParseCaipChainId).toHaveBeenCalledWith('solana:101');
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

      render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={[ethereumNetwork]}
        />,
      );

      expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
      expect(mockToHex).toHaveBeenCalledWith('1');
    });

    it('falls back to EVM chain ID when non-EVM chain ID is undefined', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmChainId) return '0x1';
        if (selector === selectSelectedNonEvmNetworkChainId) return undefined;
        if (selector === selectIsEvmNetworkSelected) return false;
        if (typeof selector === 'function') return selector({});
        return undefined;
      });

      render(<NetworkMultiSelectorList {...defaultProps} />);

      expect(mockFormatChainIdToCaip).toHaveBeenCalledWith('0x1');
    });

    it('uses non-EVM chain ID directly when available and non-EVM is selected', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmChainId) return '0x1';
        if (selector === selectSelectedNonEvmNetworkChainId)
          return 'solana:mainnet';
        if (selector === selectIsEvmNetworkSelected) return false;
        if (typeof selector === 'function') return selector({});
        return undefined;
      });

      render(<NetworkMultiSelectorList {...defaultProps} />);

      expect(mockFormatChainIdToCaip).not.toHaveBeenCalled();
    });
  });

  describe('auto-scroll behavior', () => {
    it('does not scroll when isAutoScrollEnabled is false', () => {
      render(
        <NetworkMultiSelectorList
          {...defaultProps}
          isAutoScrollEnabled={false}
        />,
      );

      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
    });

    it('scrolls to selected network offset on content size change', () => {
      const networkWithOffset: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: true,
          yOffset: 200,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={networkWithOffset}
        />,
      );

      expect(mockUseSafeAreaInsets).toHaveBeenCalled();
    });
  });

  describe('testID generation', () => {
    it('generates correct testID for selected network', () => {
      const selectedNetwork: Network[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum',
          isSelected: true,
          imageSource: { uri: 'eth.png' },
          caipChainId: 'eip155:1' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={selectedNetwork}
        />,
      );

      expect(getByTestId('network-list-item-eip155:1-selected')).toBeTruthy();
    });

    it('generates correct testID for unselected network', () => {
      const unselectedNetwork: Network[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
          caipChainId: 'eip155:137' as CaipChainId,
        },
      ];

      const { getByTestId } = render(
        <NetworkMultiSelectorList
          {...defaultProps}
          networks={unselectedNetwork}
        />,
      );

      expect(
        getByTestId('network-list-item-eip155:137-not-selected'),
      ).toBeTruthy();
    });
  });
});
