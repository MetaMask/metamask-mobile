import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';
import { AvatarIcon, IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { UseCursorPaginatedListResult } from '../../hooks/useCursorPaginatedList';
import { TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS } from './TradingActivityListSkeleton.testIds';
import TradingActivityListView, {
  TRADING_ACTIVITY_LIST_EMPTY_TEST_ID,
} from './TradingActivityListView';

interface Row {
  id: string;
  label: string;
}

const TEST_IDS = {
  LIST: 'activity-list',
};

const ROWS: Row[] = [
  { id: 'r1', label: 'First row' },
  { id: 'r2', label: 'Second row' },
];

const listState = (
  overrides: Partial<UseCursorPaginatedListResult<Row>> = {},
): UseCursorPaginatedListResult<Row> => ({
  items: ROWS,
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  error: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  isRefreshing: false,
  ...overrides,
});

const renderView = (
  list: UseCursorPaginatedListResult<Row>,
  empty: {
    emptyActionLabel?: string;
    emptyOnAction?: () => void;
    emptyIconName?: IconName;
  } = {},
) =>
  renderWithProvider(
    <TradingActivityListView
      testIDs={TEST_IDS}
      list={list}
      renderItem={(item) => <Text>{item.label}</Text>}
      emptyDescription="Your activity is empty now. Start trading to earn today!"
      emptyActionLabel={empty.emptyActionLabel}
      emptyOnAction={empty.emptyOnAction}
      emptyIconName={empty.emptyIconName}
    />,
  );

describe('TradingActivityListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per item', () => {
    const { getByText } = renderView(listState());

    expect(getByText('First row')).toBeOnTheScreen();
    expect(getByText('Second row')).toBeOnTheScreen();
  });

  it('loads the next page when the end is reached and more is available', () => {
    const loadMore = jest.fn();
    const { getByTestId } = renderView(listState({ loadMore }));

    fireEvent(getByTestId(TEST_IDS.LIST), 'endReached');

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['there is no further page', { hasMore: false }],
    ['a page is already loading', { isLoadingMore: true }],
    ['a refresh is in flight', { isRefreshing: true }],
    ['the list is empty', { items: [] }],
    ['the last page failed', { error: 'boom' }],
  ])('does not load more when %s', (_case, overrides) => {
    const loadMore = jest.fn();
    const { getByTestId } = renderView(listState({ loadMore, ...overrides }));

    fireEvent(getByTestId(TEST_IDS.LIST), 'endReached');

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('shows skeleton rows while the first page is loading', () => {
    const { getByTestId, getAllByTestId } = renderView(
      listState({ items: null, isLoading: true, hasMore: false }),
    );

    expect(
      getByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getAllByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.ROW),
    ).toHaveLength(5);
  });

  it('renders the header above the rows and while loading', () => {
    const header = <Text>Page header</Text>;
    const { getByText, rerender } = renderWithProvider(
      <TradingActivityListView
        testIDs={TEST_IDS}
        list={listState({ items: null, isLoading: true })}
        renderItem={(item: Row) => <Text>{item.label}</Text>}
        emptyDescription="Empty"
        header={header}
      />,
    );

    expect(getByText('Page header')).toBeOnTheScreen();

    rerender(
      <TradingActivityListView
        testIDs={TEST_IDS}
        list={listState()}
        renderItem={(item: Row) => <Text>{item.label}</Text>}
        emptyDescription="Empty"
        header={header}
      />,
    );

    expect(getByText('Page header')).toBeOnTheScreen();
    expect(getByText('First row')).toBeOnTheScreen();
  });

  it('keeps rows on screen during pull-to-refresh', () => {
    const { getByText, queryByTestId } = renderView(
      listState({ isRefreshing: true }),
    );

    expect(getByText('First row')).toBeOnTheScreen();
    expect(
      queryByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeNull();
  });

  it('shows the spinner footer while the next page loads', () => {
    const { UNSAFE_getByType } = renderView(listState({ isLoadingMore: true }));

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows an empty message when a successful fetch returns no activities', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = renderView(
      listState({ items: [], hasMore: false }),
    );

    expect(getByTestId(TRADING_ACTIVITY_LIST_EMPTY_TEST_ID)).toBeOnTheScreen();
    expect(
      getByText('Your activity is empty now. Start trading to earn today!'),
    ).toBeOnTheScreen();
    expect(queryByText('Error loading your transactions')).toBeNull();
    expect(
      queryByTestId(`${TRADING_ACTIVITY_LIST_EMPTY_TEST_ID}-action`),
    ).toBeNull();
    expect(
      within(getByTestId(TRADING_ACTIVITY_LIST_EMPTY_TEST_ID)).UNSAFE_getByType(
        AvatarIcon,
      ).props.iconName,
    ).toBe(IconName.Activity);
  });

  it('uses the icon passed for the empty state', () => {
    const { getByTestId } = renderView(
      listState({ items: [], hasMore: false }),
      {
        emptyIconName: IconName.People,
      },
    );

    expect(
      within(getByTestId(TRADING_ACTIVITY_LIST_EMPTY_TEST_ID)).UNSAFE_getByType(
        AvatarIcon,
      ).props.iconName,
    ).toBe(IconName.People);
  });

  it('calls the empty-state action when a label and handler are provided', () => {
    const emptyOnAction = jest.fn();
    const { getByTestId } = renderView(
      listState({ items: [], hasMore: false }),
      {
        emptyActionLabel: 'Start trading',
        emptyOnAction,
      },
    );

    fireEvent.press(
      getByTestId(`${TRADING_ACTIVITY_LIST_EMPTY_TEST_ID}-action`),
    );

    expect(emptyOnAction).toHaveBeenCalledTimes(1);
  });

  it('shows the transactions error with a retry when the list is empty and a fetch failed', () => {
    const retry = jest.fn();
    const { getByText, queryByTestId } = renderView(
      listState({ items: null, hasMore: false, error: 'failed', retry }),
    );

    expect(getByText('Error loading your transactions')).toBeOnTheScreen();
    expect(
      queryByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeNull();

    fireEvent.press(getByText('Retry'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps cached rows without an error banner after a failed refetch', () => {
    const { getByText, queryByText } = renderView(
      listState({ error: 'failed' }),
    );

    expect(getByText('First row')).toBeOnTheScreen();
    expect(queryByText('Error loading your transactions')).toBeNull();
  });
});
