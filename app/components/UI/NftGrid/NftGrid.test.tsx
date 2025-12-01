import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGrid from './NftGrid';
import { backgroundState } from '../../../util/test/initial-root-state';
import { Nft } from '@metamask/assets-controllers';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import {
  isNftFetchingProgressSelector,
  multichainCollectiblesByEnabledNetworksSelector,
} from '../../../reducers/collectibles';

const mockStore = configureMockStore();
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockTrackEvent = jest.fn();
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    push: mockPush,
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
        {data && data.length > 0 ? (
          <>
            {data.map((item: unknown, index: number) => (
              <View key={index}>{renderItem({ item, index })}</View>
            ))}
            {ListFooterComponent}
          </>
        ) : (
          <>
            {ListEmptyComponent}
            {ListFooterComponent}
          </>
        )}
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
jest.mock('./NftGridSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="nft-grid-skeleton" />;
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

// Mock BaseControlBar - renders additionalButtons
jest.mock('../shared/BaseControlBar', () => {
  const { View } = jest.requireActual('react-native');
  return ({ additionalButtons }: { additionalButtons?: React.ReactNode }) => (
    <View testID="base-control-bar">{additionalButtons}</View>
  );
});

// Mock dependencies for real NftGridItem and NftGridFooter
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: Record<string, string> = {
      'wallet.no_collectibles': 'No NFTs yet',
      'wallet.add_collectibles': 'Import NFTs',
      'wallet.view_all_nfts': 'View all NFTs',
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
  FontWeight: { Medium: 'Medium' },
  Box: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={testID}>{children}</View>;
  },
  Button: ({
    children,
    onPress,
    testID,
  }: {
    children: React.ReactNode;
    onPress: () => void;
    testID?: string;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
  ButtonVariant: { Secondary: 'Secondary' },
}));

// Mock ButtonIcon and its enums
jest.mock('../../../component-library/components/Buttons/ButtonIcon', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onPress,
      testID,
      disabled,
    }: {
      onPress: () => void;
      testID?: string;
      disabled?: boolean;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled} />
    ),
    ButtonIconSizes: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
  };
});

// Mock Icon and IconName
jest.mock('../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Add: 'Add',
  },
}));

// Mock useStyles hook
jest.mock('../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      controlIconButton: {},
    },
  })),
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

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const styleFunc = (className: string | string[]) => {
      if (Array.isArray(className)) {
        return className.reduce((acc, cls) => ({ ...acc, [cls]: true }), {});
      }
      return { [className]: true };
    };
    styleFunc.style = styleFunc;
    return styleFunc;
  },
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
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectible-Test NFT-456')).toBeOnTheScreen();
      expect(getByTestId('nft-grid-header')).toBeOnTheScreen();
    });
  });

  it('renders NFT grid directly without FlashList when homepage redesign is enabled', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectible-Test NFT-456')).toBeOnTheScreen();
      expect(getByTestId('nft-grid-header')).toBeOnTheScreen();
    });
  });

  it('renders control bar with add button', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('base-control-bar')).toBeOnTheScreen();
      expect(getByTestId('import-token-button')).toBeOnTheScreen();
    });
  });

  it('applies full view styling when isFullView is true', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid isFullView />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('base-control-bar')).toBeOnTheScreen();
      expect(getByTestId('import-token-button')).toBeOnTheScreen();
    });
  });

  it('shows view all button when homepage redesign is enabled and NFT count exceeds limit', async () => {
    const mockCollectibles = {
      '0x1': Array.from({ length: 20 }, (_, i) => ({
        ...mockNft,
        tokenId: `${i}`,
      })),
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled (maxItems = 18)
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
      expect(getByTestId('view-all-nfts-button')).toBeOnTheScreen();
    });
  });

  it('tracks analytics event when view all button is clicked', async () => {
    const mockCollectibles = {
      '0x1': Array.from({ length: 20 }, (_, i) => ({
        ...mockNft,
        tokenId: `${i}`,
      })),
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled (maxItems = 18)
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
      expect(getByTestId('view-all-nfts-button')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('view-all-nfts-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'View All Assets Clicked',
        properties: expect.objectContaining({
          asset_type: 'NFT',
        }),
      }),
    );
  });

  it('hides view all button when homepage redesign is disabled', async () => {
    const mockCollectibles = {
      '0x1': Array.from({ length: 20 }, (_, i) => ({
        ...mockNft,
        tokenId: `${i}`,
      })),
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled (maxItems = undefined)
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
      expect(queryByTestId('view-all-nfts-button')).toBeNull();
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
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectible-Test NFT-456')).toBeOnTheScreen();
      expect(queryByTestId('collectible-Test NFT-789')).toBeNull();
    });
  });

  it('navigates to AddAsset when add collectible button is pressed', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector.mockImplementation((selector) => {
      if (selector === isNftFetchingProgressSelector) {
        return false;
      }
      if (selector === multichainCollectiblesByEnabledNetworksSelector) {
        return mockCollectibles;
      }
      return {};
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

    const addButton = getByTestId('import-token-button');
    fireEvent.press(addButton);

    expect(mockPush).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('navigates to NFT details when NFT item is pressed', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
        source: 'mobile-nft-list',
      });
    });
  });

  it('passes mobile-nft-list source when navigating from homepage view', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid isFullView={false} />
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
        source: 'mobile-nft-list',
      });
    });
  });

  it('passes mobile-nft-list-page source when navigating from full view', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGrid isFullView />
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
        source: 'mobile-nft-list-page',
      });
    });
  });

  it('handles NFT without name gracefully', async () => {
    const nftWithoutName = { ...mockNft, name: null };
    const mockCollectibles = { '0x1': [nftWithoutName] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectible-null-456')).toBeOnTheScreen();
    });
  });

  it('renders NFT items when not fetching without homepage redesign', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectible-Test NFT-456')).toBeOnTheScreen();
      expect(getByTestId('nft-grid-header')).toBeOnTheScreen();
    });
  });

  it('shows empty state when not fetching with homepage redesign enabled and no collectibles', async () => {
    const mockCollectibles = { '0x1': [] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectibles-empty-state')).toBeOnTheScreen();
    });
  });

  it('hides spinner in footer when NFTs are not being fetched', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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
      expect(getByTestId('collectibles-empty-state')).toBeOnTheScreen();
    });
  });

  it('hides empty state when fetching NFTs without homepage redesign', async () => {
    mockUseSelector
      .mockReturnValueOnce(true) // isNftFetchingProgress
      .mockReturnValueOnce(false) // selectHomepageRedesignV1Enabled
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

  it('renders NFT items when not fetching with homepage redesign enabled', async () => {
    const mockCollectibles = { '0x1': [mockNft] };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('collectible-Test NFT-456')).toBeOnTheScreen();
      expect(queryByTestId('collectibles-empty-state')).toBeNull();
    });
  });

  it('navigates to full view when view all button is pressed', async () => {
    const mockCollectibles = {
      '0x1': Array.from({ length: 20 }, (_, i) => ({
        ...mockNft,
        tokenId: `${i}`,
      })),
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled (maxItems = 18)
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
      const viewAllButton = getByTestId('view-all-nfts-button');
      fireEvent.press(viewAllButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('NftFullView');
  });

  it('limits NFTs to 18 when homepage redesign is enabled and not full view', async () => {
    const mockCollectibles = {
      '0x1': Array.from({ length: 25 }, (_, i) => ({
        ...mockNft,
        tokenId: `${i}`,
        name: `NFT ${i}`,
      })),
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled (maxItems = 18)
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <NftGrid />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      // Should render first 18 NFTs
      expect(getByTestId('collectible-NFT 0-0')).toBeOnTheScreen();
      expect(getByTestId('collectible-NFT 17-17')).toBeOnTheScreen();

      // Should NOT render NFTs beyond 18
      expect(queryByTestId('collectible-NFT 18-18')).toBeNull();
      expect(queryByTestId('collectible-NFT 24-24')).toBeNull();

      // View all button should be present
      expect(getByTestId('view-all-nfts-button')).toBeOnTheScreen();
    });
  });

  it('does not limit NFTs when full view is enabled', async () => {
    const mockCollectibles = {
      '0x1': Array.from({ length: 25 }, (_, i) => ({
        ...mockNft,
        tokenId: `${i}`,
        name: `NFT ${i}`,
      })),
    };
    mockUseSelector
      .mockReturnValueOnce(false) // isNftFetchingProgress
      .mockReturnValueOnce(true) // selectHomepageRedesignV1Enabled
      .mockReturnValueOnce(mockCollectibles); // multichainCollectiblesByEnabledNetworksSelector
    const store = mockStore(initialState);

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <NftGrid isFullView />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      // Should render all NFTs when full view
      expect(getByTestId('collectible-NFT 0-0')).toBeOnTheScreen();
      expect(getByTestId('collectible-NFT 24-24')).toBeOnTheScreen();

      // View all button should NOT be present in full view
      expect(queryByTestId('view-all-nfts-button')).toBeNull();
    });
  });
});
