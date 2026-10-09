jest.mock('@shopify/flash-list', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: RN.FlatList };
});

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import CardList from './CardList';

interface Row {
  id: string;
}

const Skeleton = () => <Text testID="card-skeleton">sk</Text>;

const renderItem: ListRenderItem<Row> = ({ item }) => (
  <Text testID={`row-${item.id}`}>{item.id}</Text>
);

describe('CardList', () => {
  it('renders skeleton rows while loading and hides the list', () => {
    const { getAllByTestId, queryByTestId } = render(
      <CardList<Row>
        data={[{ id: 'a' }, { id: 'b' }]}
        isLoading
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="pfx"
        listTestId="card-list-flash"
      />,
    );

    expect(getAllByTestId('card-skeleton')).toHaveLength(3);
    expect(queryByTestId('card-list-flash')).toBeNull();
  });

  it('respects skeletonCount while loading', () => {
    const { getAllByTestId } = render(
      <CardList<Row>
        data={[]}
        isLoading
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="pfx"
        skeletonCount={2}
      />,
    );
    expect(getAllByTestId('card-skeleton')).toHaveLength(2);
  });

  it('slices data to max and renders rows when not loading', () => {
    const { getByTestId, queryByTestId } = render(
      <CardList<Row>
        data={[{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]}
        isLoading={false}
        max={2}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="pfx"
        listTestId="card-list-flash"
      />,
    );

    expect(getByTestId('card-list-flash')).toBeTruthy();
    expect(getByTestId('row-1')).toBeTruthy();
    expect(getByTestId('row-2')).toBeTruthy();
    expect(queryByTestId('row-3')).toBeNull();
    expect(queryByTestId('row-4')).toBeNull();
  });

  it('adds horizontal padding around the list by default', () => {
    const { getByTestId } = render(
      <CardList<Row>
        data={[{ id: '1' }]}
        isLoading={false}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="pfx"
        listTestId="card-list-flash"
      />,
    );

    expect(getByTestId('card-list-flash').props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingLeft: 16, paddingRight: 16 }),
    );
  });

  it('omits horizontal padding when horizontalInset is false', () => {
    const { getByTestId } = render(
      <CardList<Row>
        data={[{ id: '1' }]}
        isLoading={false}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="pfx"
        listTestId="card-list-flash"
        horizontalInset={false}
      />,
    );

    expect(
      getByTestId('card-list-flash').props.contentContainerStyle,
    ).toBeUndefined();
  });

  it('omits horizontal padding on the loading container when horizontalInset is false', () => {
    const { getByTestId } = render(
      <CardList<Row>
        data={[]}
        isLoading
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="pfx"
        horizontalInset={false}
      />,
    );

    expect(getByTestId('explore-card-list').props.style).toEqual(
      expect.not.objectContaining({ paddingLeft: 16, paddingRight: 16 }),
    );
  });
});
