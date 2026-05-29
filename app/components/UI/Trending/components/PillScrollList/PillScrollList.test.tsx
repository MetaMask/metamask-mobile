import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import PillScrollList from './PillScrollList';

const Skeleton = () => <Text testID="pill-scroll-skeleton">loading</Text>;

describe('PillScrollList', () => {
  it('renders skeleton when loading and does not render the scroll list', () => {
    const { getByTestId, queryByTestId } = render(
      <PillScrollList
        data={[{ id: 'a' }, { id: 'b' }]}
        isLoading
        renderItem={() => <Text>item</Text>}
        keyExtractor={(item: { id: string }) => item.id}
        Skeleton={Skeleton}
        listTestId="pills-list"
      />,
    );

    expect(getByTestId('pill-scroll-skeleton')).toBeTruthy();
    expect(queryByTestId('pills-list')).toBeNull();
  });

  it('renders nothing in the scroll region when not loading and data is empty', () => {
    const { queryByTestId } = render(
      <PillScrollList
        data={[]}
        isLoading={false}
        renderItem={() => <Text>item</Text>}
        keyExtractor={(item: { id: string }) => item.id}
        Skeleton={Skeleton}
        listTestId="pills-list"
      />,
    );

    expect(queryByTestId('pills-list')).toBeNull();
  });

  it('splits items across two rows and passes correct indices to renderItem', () => {
    const renderItem = jest.fn((item: { id: string }, index: number) => (
      <Text testID={`pill-${item.id}`}>{String(index)}</Text>
    ));

    const { getByTestId } = render(
      <PillScrollList
        data={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]}
        isLoading={false}
        renderItem={renderItem}
        keyExtractor={(item: { id: string }) => item.id}
        Skeleton={Skeleton}
        listTestId="pills-list"
      />,
    );

    expect(getByTestId('pills-list')).toBeTruthy();
    expect(getByTestId('pill-a').props.children).toBe('0');
    expect(getByTestId('pill-b').props.children).toBe('1');
    expect(getByTestId('pill-c').props.children).toBe('2');
    expect(renderItem).toHaveBeenCalledTimes(3);
  });

  it('respects maxPills when slicing data before splitting', () => {
    const { getByTestId, queryByTestId } = render(
      <PillScrollList
        data={[{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]}
        isLoading={false}
        maxPills={2}
        renderItem={(item: { id: string }) => (
          <Text testID={`pill-${item.id}`}>{item.id}</Text>
        )}
        keyExtractor={(item: { id: string }) => item.id}
        Skeleton={Skeleton}
        listTestId="pills-list"
      />,
    );

    expect(getByTestId('pill-1')).toBeTruthy();
    expect(getByTestId('pill-2')).toBeTruthy();
    expect(queryByTestId('pill-3')).toBeNull();
    expect(queryByTestId('pill-4')).toBeNull();
  });
});
