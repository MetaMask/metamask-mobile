import React from 'react';
import { render } from '@testing-library/react-native';
import { ExternalVirtualized } from './ExternalVirtualized';

describe('ExternalVirtualized', () => {
  const mockData = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
    { id: 5, name: 'Item 5' },
  ];

  const mockRenderItem = ({ item }: { item: { id: number; name: string } }) => (
    <div key={item.id}>{item.name}</div>
  );

  const defaultProps = {
    data: mockData,
    renderItem: mockRenderItem,
    itemHeight: 50,
    parentScrollY: 0,
    parentViewportHeight: 200,
    keyExtractor: (item: { id: number; name: string }) => item.id.toString(),
    initialItemCount: 3,
    maxVisibleItems: 5,
  };

  it('renders correctly with basic props', () => {
    const { getByTestId } = render(
      <ExternalVirtualized {...defaultProps} testID="external-virtualized" />,
    );

    expect(getByTestId('external-virtualized')).toBeTruthy();
  });

  it('renders only visible items based on scroll position', () => {
    const { queryByText } = render(
      <ExternalVirtualized
        {...defaultProps}
        parentScrollY={100} // Should show items starting from index 2
        parentViewportHeight={100}
      />,
    );

    // With scroll position 100 and viewport height 100, items 2-4 should be visible
    expect(queryByText('Item 3')).toBeTruthy();
    expect(queryByText('Item 4')).toBeTruthy();
  });

  it('renders empty component when no data', () => {
    const EmptyComponent = () => <div>No items</div>;

    const { queryByText } = render(
      <ExternalVirtualized
        {...defaultProps}
        data={[]}
        ListEmptyComponent={<EmptyComponent />}
      />,
    );

    expect(queryByText('No items')).toBeTruthy();
  });

  it('renders header and footer components', () => {
    const HeaderComponent = () => <div>Header</div>;
    const FooterComponent = () => <div>Footer</div>;

    const { queryByText } = render(
      <ExternalVirtualized
        {...defaultProps}
        ListHeaderComponent={<HeaderComponent />}
        ListFooterComponent={<FooterComponent />}
      />,
    );

    expect(queryByText('Header')).toBeTruthy();
    expect(queryByText('Footer')).toBeTruthy();
  });
});
