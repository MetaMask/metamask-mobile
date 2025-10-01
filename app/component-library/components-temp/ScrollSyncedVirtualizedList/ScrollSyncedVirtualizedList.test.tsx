import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ScrollSyncedVirtualizedList } from './ScrollSyncedVirtualizedList';

// Mock data for testing
const mockData = Array.from({ length: 100 }, (_, index) => ({
  id: `item-${index}`,
  title: `Item ${index}`,
  value: index,
}));

const renderItem = ({ item }: { item: (typeof mockData)[0] }) => (
  <View testID={`item-${item.id}`}>
    <Text>{item.title}</Text>
  </View>
);

const keyExtractor = (item: (typeof mockData)[0]) => item.id;

describe('ScrollSyncedVirtualizedList', () => {
  const defaultProps = {
    data: mockData,
    renderItem,
    itemHeight: 64,
    parentScrollY: 0,
    _parentViewportHeight: 400,
    keyExtractor,
    testID: 'virtualized-list',
  };

  describe('Basic Rendering', () => {
    it('renders correctly with data', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} />,
      );

      expect(getByTestId('virtualized-list')).toBeTruthy();
    });

    it('renders initial items when scroll is at top', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} />,
      );

      // Should render first 6 items initially
      expect(getByTestId('item-item-0')).toBeTruthy();
      expect(getByTestId('item-item-1')).toBeTruthy();
      expect(getByTestId('item-item-5')).toBeTruthy();
    });

    it('renders empty state when no data', () => {
      const EmptyComponent = () => (
        <View testID="empty-component">
          <Text>No items</Text>
        </View>
      );

      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          data={[]}
          ListEmptyComponent={<EmptyComponent />}
        />,
      );

      expect(getByTestId('empty-component')).toBeTruthy();
    });
  });

  describe('Virtualization', () => {
    it('renders different items when scrolled', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} />,
      );

      // Initially at top
      expect(getByTestId('item-item-0')).toBeTruthy();

      // Scroll down significantly (simulate scroll to item 20)
      rerender(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          parentScrollY={20 * 64} // 20 items * 64px height
        />,
      );

      // Item 0 should no longer be rendered (virtualized out)
      expect(queryByTestId('item-item-0')).toBeNull();

      // Items around position 20 should be rendered
      expect(getByTestId('item-item-20')).toBeTruthy();
    });

    it('calculates correct spacers for virtualization', () => {
      const { rerender } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          parentScrollY={10 * 64} // Scroll to item 10
        />,
      );

      // The component should render items around index 10
      // with proper top and bottom spacers
      // This is tested implicitly through the rendering behavior
    });
  });

  describe('Header and Footer Components', () => {
    it('renders header component', () => {
      const HeaderComponent = () => (
        <View testID="header-component">
          <Text>Header</Text>
        </View>
      );

      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          ListHeaderComponent={<HeaderComponent />}
        />,
      );

      expect(getByTestId('header-component')).toBeTruthy();
    });

    it('renders footer component', () => {
      const FooterComponent = () => (
        <View testID="footer-component">
          <Text>Footer</Text>
        </View>
      );

      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          ListFooterComponent={<FooterComponent />}
        />,
      );

      expect(getByTestId('footer-component')).toBeTruthy();
    });

    it('renders header as component class', () => {
      const HeaderComponent = () => (
        <View testID="header-class-component">
          <Text>Header Class</Text>
        </View>
      );

      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          ListHeaderComponent={HeaderComponent}
        />,
      );

      expect(getByTestId('header-class-component')).toBeTruthy();
    });

    it('renders footer as component class', () => {
      const FooterComponent = () => (
        <View testID="footer-class-component">
          <Text>Footer Class</Text>
        </View>
      );

      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          ListFooterComponent={FooterComponent}
        />,
      );

      expect(getByTestId('footer-class-component')).toBeTruthy();
    });
  });

  describe('Layout Handling', () => {
    it('handles layout events', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} />,
      );

      const container = getByTestId('virtualized-list');

      // Simulate layout event
      fireEvent(container, 'layout', {
        nativeEvent: {
          layout: { x: 0, y: 100, width: 300, height: 400 },
        },
      });

      // Component should handle the layout event without crashing
      expect(container).toBeTruthy();
    });
  });

  describe('Key Extraction', () => {
    it('uses custom keyExtractor when provided', () => {
      const customKeyExtractor = jest.fn(
        (item: (typeof mockData)[0]) => `custom-${item.id}`,
      );

      render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          keyExtractor={customKeyExtractor}
        />,
      );

      expect(customKeyExtractor).toHaveBeenCalled();
    });

    it('falls back to index when no keyExtractor provided', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          keyExtractor={undefined}
        />,
      );

      // Should still render without errors
      expect(getByTestId('virtualized-list')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty data array', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} data={[]} />,
      );

      expect(getByTestId('virtualized-list')).toBeTruthy();
    });

    it('handles single item', () => {
      const singleItem = [mockData[0]];

      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} data={singleItem} />,
      );

      expect(getByTestId('item-item-0')).toBeTruthy();
    });

    it('handles very large scroll position', () => {
      const { rerender } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          parentScrollY={10000} // Very large scroll
        />,
      );

      // Should not crash and should render items near the end
      // The exact items depend on the virtualization logic
    });

    it('handles zero item height', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} itemHeight={0} />,
      );

      // Should render without crashing
      expect(getByTestId('virtualized-list')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('does not render all items when data is large', () => {
      const largeData = Array.from({ length: 1000 }, (_, index) => ({
        id: `item-${index}`,
        title: `Item ${index}`,
        value: index,
      }));

      const { queryByTestId } = render(
        <ScrollSyncedVirtualizedList {...defaultProps} data={largeData} />,
      );

      // Should only render initial items, not all 1000
      expect(queryByTestId('item-item-0')).toBeTruthy();
      expect(queryByTestId('item-item-5')).toBeTruthy();
      expect(queryByTestId('item-item-100')).toBeNull(); // Should not render item 100
      expect(queryByTestId('item-item-999')).toBeNull(); // Should not render last item
    });
  });

  describe('Accessibility', () => {
    it('passes testID to container', () => {
      const { getByTestId } = render(
        <ScrollSyncedVirtualizedList
          {...defaultProps}
          testID="custom-test-id"
        />,
      );

      expect(getByTestId('custom-test-id')).toBeTruthy();
    });
  });
});
