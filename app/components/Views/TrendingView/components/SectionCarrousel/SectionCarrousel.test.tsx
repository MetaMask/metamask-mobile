import React from 'react';
import { Text } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SectionCarrousel from './SectionCarrousel';

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
  };
});

const initialState = {
  engine: {
    backgroundState,
  },
};

interface MockItem {
  id: string;
  title: string;
}

describe('SectionCarrousel', () => {
  const mockData: MockItem[] = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
    { id: '3', title: 'Item 3' },
  ];

  const mockRenderItem = jest.fn((item: MockItem) => (
    <Text testID={`item-${item.id}`}>{item.title}</Text>
  ));

  const mockKeyExtractor = jest.fn((item: MockItem) => item.id);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders all items using the provided renderItem function', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
        />,
        { state: initialState },
      );

      expect(getByTestId('item-1')).toBeOnTheScreen();
      expect(getByTestId('item-2')).toBeOnTheScreen();
      expect(getByTestId('item-3')).toBeOnTheScreen();
      expect(mockRenderItem).toHaveBeenCalledTimes(3);
    });

    it('renders pagination dots when showPagination is true', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(getByTestId('test-carousel-pagination-dot-0')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-1')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-2')).toBeOnTheScreen();
    });

    it('hides pagination dots when showPagination is false', () => {
      const { queryByTestId } = renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
          showPagination={false}
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(queryByTestId('test-carousel-pagination-dot-0')).toBeNull();
      expect(queryByTestId('test-carousel-pagination-dot-1')).toBeNull();
      expect(queryByTestId('test-carousel-pagination-dot-2')).toBeNull();
    });

    it('renders FlashList with correct testID prefix', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
          testIDPrefix="custom-prefix"
        />,
        { state: initialState },
      );

      expect(getByTestId('custom-prefix-flash-list')).toBeOnTheScreen();
    });

    it('uses default testID prefix when not provided', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
    });
  });

  describe('pagination interaction', () => {
    it('renders pressable pagination dot without errors', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      const dot = getByTestId('test-carousel-pagination-dot-1');

      // The component renders pagination dots correctly
      expect(dot).toBeOnTheScreen();
    });
  });

  describe('keyExtractor', () => {
    it('calls keyExtractor for each item with item and index', () => {
      renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
        />,
        { state: initialState },
      );

      // FlatList/FlashList passes both item and index to keyExtractor
      expect(mockKeyExtractor).toHaveBeenCalledWith(mockData[0], 0);
      expect(mockKeyExtractor).toHaveBeenCalledWith(mockData[1], 1);
      expect(mockKeyExtractor).toHaveBeenCalledWith(mockData[2], 2);
    });
  });

  describe('empty data', () => {
    it('renders without items when data is empty', () => {
      const { queryByTestId } = renderWithProvider(
        <SectionCarrousel
          data={[]}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(queryByTestId('test-carousel-pagination-dot-0')).toBeNull();
      expect(mockRenderItem).not.toHaveBeenCalled();
    });
  });

  describe('single item', () => {
    it('renders pagination dot for single item', () => {
      const singleItem = [{ id: '1', title: 'Single Item' }];

      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          data={singleItem}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(getByTestId('test-carousel-pagination-dot-0')).toBeOnTheScreen();
      expect(mockRenderItem).toHaveBeenCalledWith(singleItem[0], 0);
    });
  });

  describe('renderItem callback', () => {
    it('passes correct item and index to renderItem', () => {
      renderWithProvider(
        <SectionCarrousel
          data={mockData}
          renderItem={mockRenderItem}
          keyExtractor={mockKeyExtractor}
        />,
        { state: initialState },
      );

      expect(mockRenderItem).toHaveBeenNthCalledWith(1, mockData[0], 0);
      expect(mockRenderItem).toHaveBeenNthCalledWith(2, mockData[1], 1);
      expect(mockRenderItem).toHaveBeenNthCalledWith(3, mockData[2], 2);
    });
  });
});
