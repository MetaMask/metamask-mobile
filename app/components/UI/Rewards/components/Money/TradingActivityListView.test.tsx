import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { UseCursorPaginatedListResult } from '../../hooks/useCursorPaginatedList';
import { TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS } from './TradingActivityListSkeleton.testIds';
import TradingActivityListView, {
  TRADING_ACTIVITY_LIST_EMPTY_TEST_ID,
} from './TradingActivityListView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../Views/ErrorBoundary', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

interface Row {
  id: string;
  label: string;
}

const TEST_IDS = {
  CONTAINER: 'activity-view',
  LIST: 'activity-list',
  SKELETON_SLOT: 'activity-skeleton-slot',
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
  empty: { emptyActionLabel?: string; emptyOnAction?: () => void } = {},
) =>
  renderWithProvider(
    <TradingActivityListView
      view="TestActivityView"
      title="Activity"
      testIDs={TEST_IDS}
      list={list}
      renderItem={(item) => <Text>{item.label}</Text>}
      emptyDescription="Your activity is empty now. Start trading to earn today!"
      emptyActionLabel={empty.emptyActionLabel}
      emptyOnAction={empty.emptyOnAction}
    />,
  );

describe('TradingActivityListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and one row per item', () => {
    const { getByTestId, getByText } = renderView(listState());

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByText('Activity')).toBeOnTheScreen();
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

  it('fills the measured body with skeleton rows while the first page is loading', () => {
    const { getByTestId, getAllByTestId, queryByTestId } = renderView(
      listState({ items: null, isLoading: true, hasMore: false }),
    );

    expect(
      getByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(TEST_IDS.LIST)).toBeNull();

    fireEvent(getByTestId(TEST_IDS.SKELETON_SLOT), 'layout', {
      nativeEvent: { layout: { height: 280, width: 200, x: 0, y: 0 } },
    });

    expect(
      getAllByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.ROW),
    ).toHaveLength(5);
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

  it('navigates back from the header', () => {
    const { getByTestId } = renderView(listState());

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
