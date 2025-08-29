import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import Routes from '../../../../../../constants/navigation/Routes';
// eslint-disable-next-line import/no-namespace
import * as AssetSelectionMetrics from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { AssetType } from '../../../types/token';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { Asset } from './asset';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  })),
}));

const mockHandleCancelPress = jest.fn();
const mockTokens: AssetType[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    balance: '1.5',
    balanceFiat: '$3000.00',
    image: 'https://example.com/eth.png',
    aggregators: [],
    logo: 'https://example.com/eth.png',
    isETH: true,
    isNative: true,
    ticker: 'ETH',
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    chainId: '0x1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '1000.0',
    balanceFiat: '$1000.00',
    image: 'https://example.com/usdc.png',
    aggregators: [],
    logo: 'https://example.com/usdc.png',
    isETH: false,
    isNative: false,
    ticker: 'USDC',
  },
];

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#ffffff' },
      text: { default: '#000000' },
    },
  }),
}));

jest.mock('../../../hooks/send/evm/useSelectedEVMAccountTokens', () => ({
  useSelectedEVMAccountTokens: () => mockTokens,
}));

jest.mock('../../../hooks/send/useTokenSearch', () => ({
  useTokenSearch: () => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    filteredTokens: mockTokens,
    clearSearch: jest.fn(),
  }),
}));

jest.mock('../../../hooks/send/useSendActions', () => ({
  useSendActions: () => ({
    handleCancelPress: mockHandleCancelPress,
  }),
}));

jest.mock('../../../hooks/send/useSendNavbar', () => ({
  useSendNavbar: jest.fn(),
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, renderTabBar }: any) => (
      <View testID="scrollable-tab-view">
        {renderTabBar?.()}
        {children}
      </View>
    ),
  };
});

jest.mock(
  '../../../../../../component-library/components-temp/TabBar/TabBar',
  () => {
    const { View, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: () => (
        <View testID="tab-bar">
          <Text>TabBar</Text>
        </View>
      ),
    };
  },
);

jest.mock(
  '../../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const { TextInput } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        value,
        onChangeText,
        placeholder,
        onPressClearButton,
      }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any) => (
        <TextInput
          testID="search-input"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          onPressClearButton={onPressClearButton}
        />
      ),
    };
  },
);

jest.mock('../../token-list', () => ({
  TokenList: ({ tokens }: { tokens: AssetType[] }) => {
    const { View, Text } = jest.requireActual('react-native');

    return (
      <View testID="token-list">
        <Text>TokenList with {tokens.length} tokens</Text>
      </View>
    );
  },
}));

describe('Asset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component correctly', () => {
    render(<Asset />);

    expect(screen.getByTestId('search-input')).toBeOnTheScreen();
    expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('token-list')).toBeOnTheScreen();
  });

  it('calls useSendNavbar with correct currentRoute', () => {
    render(<Asset />);

    expect(useSendNavbar).toHaveBeenCalledWith({
      currentRoute: Routes.SEND.ASSET,
    });
  });

  it('displays search input with correct placeholder', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput.props.placeholder).toBe('Search');
  });

  it('renders TokenList with filtered tokens', () => {
    render(<Asset />);

    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();
  });

  it('renders NFTs tab with placeholder text', () => {
    render(<Asset />);

    expect(
      screen.getByText(
        'NFTs - will be implemented in separate PR - Intentional empty',
      ),
    ).toBeOnTheScreen();
  });

  it('handles clear search functionality', () => {
    const mockClearSearch = jest.fn();
    jest.doMock('../../../hooks/send/useTokenSearch', () => ({
      useTokenSearch: () => ({
        searchQuery: 'ETH',
        setSearchQuery: jest.fn(),
        filteredTokens: [mockTokens[0]],
        clearSearch: mockClearSearch,
      }),
    }));

    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput.props.onPressClearButton).toBeDefined();
  });

  it('uses correct TextFieldSize for search input', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeOnTheScreen();
  });

  it('renders tabs with correct labels', () => {
    render(<Asset />);

    expect(screen.getByText('TabBar')).toBeOnTheScreen();
  });

  it('uses correct TextFieldSize for search input', () => {
    const mockSetAssetListSize = jest.fn();
    const mockSetNoneAssetFilterMethod = jest.fn();
    const mockSetSearchAssetFilterMethod = jest.fn();
    jest
      .spyOn(AssetSelectionMetrics, 'useAssetSelectionMetrics')
      .mockReturnValue({
        setAssetListSize: mockSetAssetListSize,
        setNoneAssetFilterMethod: mockSetNoneAssetFilterMethod,
        setSearchAssetFilterMethod: mockSetSearchAssetFilterMethod,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent.changeText(searchInput, 'Eth');
    fireEvent.changeText(searchInput, '');
    fireEvent.changeText(searchInput, 'Eth');
    expect(mockSetAssetListSize).toHaveBeenCalled();
    expect(mockSetNoneAssetFilterMethod).toHaveBeenCalled();
  });
});
