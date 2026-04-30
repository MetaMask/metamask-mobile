jest.mock('@shopify/flash-list', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: RN.FlatList };
});

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import PillToggleCardList from './PillToggleCardList';

interface Row { id: string; label: string }

const Skeleton = () => <Text testID="card-list-skeleton">sk</Text>;

const renderItem: ListRenderItem<Row> = ({ item }) => (
  <Text testID={`card-row-${item.id}`}>{item.label}</Text>
);

describe('PillToggleCardList', () => {
  const tabs = [
    {
      key: 'a',
      name: 'Tab A',
      items: [{ id: '1', label: 'One' }],
    },
    {
      key: 'b',
      name: 'Tab B',
      items: [
        { id: '2', label: 'Two' },
        { id: '3', label: 'Three' },
      ],
    },
  ];

  it('defaults to first tab when defaultPillKey is omitted', () => {
    const { getByTestId } = render(
      <PillToggleCardList<Row>
        tabs={tabs}
        isLoading={false}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="test"
        testIdPrefix="toggle-list"
        listTestId="card-flash"
      />,
    );

    expect(getByTestId('toggle-list')).toBeTruthy();
    expect(getByTestId('card-row-1')).toBeTruthy();
  });

  it('starts on defaultPillKey when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <PillToggleCardList<Row>
        tabs={tabs}
        isLoading={false}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="test"
        defaultPillKey="b"
        testIdPrefix="toggle-list"
        listTestId="card-flash"
      />,
    );

    expect(getByTestId('card-row-2')).toBeTruthy();
    expect(queryByTestId('card-row-1')).toBeNull();
  });

  it('switches CardList data when a different pill is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <PillToggleCardList<Row>
        tabs={tabs}
        isLoading={false}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="test"
        testIdPrefix="toggle-list"
        listTestId="card-flash"
      />,
    );

    act(() => {
      fireEvent.press(getByTestId('toggle-list-pill-b'));
    });

    expect(queryByTestId('card-row-1')).toBeNull();
    expect(getByTestId('card-row-2')).toBeTruthy();
    expect(getByTestId('card-row-3')).toBeTruthy();
  });

  it('shows skeletons while loading', () => {
    const { getAllByTestId } = render(
      <PillToggleCardList<Row>
        tabs={tabs}
        isLoading
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix="test"
        testIdPrefix="toggle-list"
      />,
    );

    expect(getAllByTestId('card-list-skeleton').length).toBeGreaterThan(0);
  });
});
