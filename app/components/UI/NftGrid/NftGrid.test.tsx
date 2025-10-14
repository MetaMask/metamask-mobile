import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGrid from './NftGrid';
import { backgroundState } from '../../../util/test/initial-root-state';
import { Nft } from '@metamask/assets-controllers';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const mockStore = configureMockStore();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock metrics
jest.mock('../../hooks/useMetrics');
(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data,
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
    ListFooterComponent,
    testID,
  }: {
    data: unknown[];
    renderItem: ({
      item,
      index,
    }: {
      item: unknown;
      index: number;
    }) => React.ReactElement;
    ListHeaderComponent: React.ReactElement;
    ListEmptyComponent: React.ReactElement;
    ListFooterComponent: React.ReactElement;
    testID: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View testID={testID}>
        {ListHeaderComponent}
        {data && data.length > 0
          ? data.map((item: unknown, index: number) => (
              <View key={index}>{renderItem({ item, index })}</View>
            ))
          : ListEmptyComponent}
        {ListFooterComponent}
      </View>
    );
  },
}));

// Mock ActionSheet - simplified since we don't test the action sheet behavior in this component
jest.mock('@metamask/react-native-actionsheet', () => () => null);

// Mock child components with minimal complexity
jest.mock('./NftGridRefreshControl', () => () => null);
jest.mock('./NftGridItemActionSheet', () => () => null);
jest.mock('./NftGridHeader', () => {
  const { View, Text } = jest.requireActual('react-native');
  return () => (
    <View testID="nft-grid-header">
      <Text>Header</Text>
    </View>
  );
});

// Mock CollectiblesEmptyState - has complex dependencies
jest.mock('../CollectiblesEmptyState', () => ({
  CollectiblesEmptyState: ({
    onAction,
    actionButtonProps,
    testID,
  }: {
    onAction: () => void;
    actionButtonProps: { testID: string; isDisabled: boolean };
    testID: string;
  }) => {
    const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
    return (
      <View testID={testID}>
        <TouchableOpacity
          testID={actionButtonProps.testID}
          onPress={onAction}
          disabled={actionButtonProps.isDisabled}
        >
          <Text>Import NFTs</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock dependencies for real NftGridItem and NftGridFooter
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: Record<string, string> = {
      'wallet.no_collectibles': 'No NFTs yet',
      'wallet.add_collectibles': 'Import NFTs',
    };
    return strings[key] || key;
  },
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { alternative: '#666666' },
      primary: { default: '#037DD6' },
    },
  }),
}));

jest.mock('../CollectibleMedia', () => () => null);
jest.mock('@metamask/design-system-react-native', () => ({
  Text: ({ children }: { children: React.ReactNode }) => children,
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
}));

jest.mock('../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return ({
    children,
    style,
    ...props
  }: {
    children: React.ReactNode;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <Text style={style} {...props}>
      {children}
    </Text>
  );
});

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock trace utilities
jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: { LoadCollectibles: 'LoadCollectibles' },
}));

describe('NftGrid', () => {
  const mockNft: Nft = {
    address: '0x123',
    tokenId: '456',
    name: 'Test NFT',
    image: 'https://example.com/nft.png',
    collection: { name: 'Test Collection' },
    chainId: 1,
    isCurrentlyOwned: true,
    standard: 'ERC721',
  } as Nft;

  const initialState = {
    collectibles: { isNftFetchingProgress: false },
    engine: { backgroundState },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders NFT grid when collectibles are present', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('collectible-Test NFT-456')).toBeDefined();
      expect(getByTestId('nft-grid-header')).toBeDefined();
    });
  });

  it('filters out non-owned collectibles', async () => {
    const mockCollectibles = {
      '0x1': [
        { ...mockNft, isCurrentlyOwned: true },
        { ...mockNft, tokenId: '789', isCurrentlyOwned: false },
      ],
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { queryByTestId, getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('collectible-Test NFT-456')).toBeDefined();
      expect(queryByTestId('collectible-Test NFT-789')).toBeNull();
    });
  });

  it('calls navigation when add collectible is triggered from empty state', async () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        return false; // isNftFetchingProgress
      }
      return {}; // multichainCollectiblesByEnabledNetworksSelector
    });
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      const emptyState = getByTestId('import-collectible-button');
      expect(emptyState).toBeDefined();
    });

    const emptyState = getByTestId('import-collectible-button');
    fireEvent.press(emptyState);

    expect(mockNavigate).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('navigates to NFT details when NFT item is pressed', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      const nftItem = getByTestId('collectible-Test NFT-456');
      fireEvent.press(nftItem);

      expect(mockNavigate).toHaveBeenCalledWith('NftDetails', {
        collectible: mockNft,
      });
    });
  });

  it('handles NFT without name gracefully', async () => {
    const nftWithoutName = { ...mockNft, name: null };
    const mockCollectibles = { '0x1': [nftWithoutName] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('collectible-null-456')).toBeDefined();
    });
  });

  it('shows spinner in footer when NFTs are being fetched', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(true) // isNftFetchingProgress
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('collectible-contracts-spinner')).toBeDefined();
    });
  });

  it('hides spinner in footer when NFTs are not being fetched', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { queryByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(queryByTestId('collectible-contracts-spinner')).toBeNull();
    });
  });

  it('shows empty state when no collectibles and not fetching', async () => {
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce({}); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('collectibles-empty-state')).toBeDefined();
    });
  });

  it('hides empty state when fetching NFTs', async () => {
    mockUseSelector
      .mockReturnValueOnce(true) // isNftFetchingProgress
      .mockReturnValueOnce({}); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { queryByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(queryByTestId('collectibles-empty-state')).toBeNull();
    });
  });
});
