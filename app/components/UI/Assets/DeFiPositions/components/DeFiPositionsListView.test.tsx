import React from 'react';
import { Text } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import DeFiPositionsListView, {
  DeFiPositionsListState,
} from './DeFiPositionsListView';
import { strings } from '../../../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => {
  const { AnalyticsEventBuilder: MockAnalyticsEventBuilder } =
    jest.requireActual('../../../../../util/analytics/AnalyticsEventBuilder');
  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: MockAnalyticsEventBuilder.createEventBuilder,
    }),
  };
});

// The control bar and empty state pull in heavy selector trees that are not
// relevant to this presentational component; stub them out.
jest.mock('../../../DeFiPositions/DeFiPositionsControlBar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="control-bar" />,
  };
});

jest.mock('../../../DefiEmptyState', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    DefiEmptyState: () => <View testID="defi-empty-state" />,
  };
});

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const readyState = (listLength: number): DeFiPositionsListState => ({
  status: 'ready',
  listLength,
  items: Array.from({ length: listLength }, (_, i) => (
    <Text key={i}>{`item-${i}`}</Text>
  )),
});

const renderComponent = (
  state: DeFiPositionsListState,
  overrides: Partial<React.ComponentProps<typeof DeFiPositionsListView>> = {},
) =>
  renderWithProvider(
    <DeFiPositionsListView
      state={state}
      isFullView
      refreshing={false}
      onRefresh={jest.fn()}
      {...overrides}
    />,
    { state: mockInitialState },
  );

describe('DeFiPositionsListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading message when loading', () => {
    const { getByText, queryByTestId } = renderComponent({ status: 'loading' });

    expect(
      getByText(strings('defi_positions.loading_positions')),
    ).toBeOnTheScreen();
    expect(queryByTestId('control-bar')).toBeNull();
  });

  it('renders the error messages when in error state', () => {
    const { getByText } = renderComponent({ status: 'error' });

    expect(
      getByText(strings('defi_positions.error_cannot_load_page')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('defi_positions.error_visit_again')),
    ).toBeOnTheScreen();
  });

  it('renders the control bar and list items when ready with items', () => {
    const { getByTestId, getByText } = renderComponent(readyState(2));

    expect(getByTestId('control-bar')).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_LIST),
    ).toBeOnTheScreen();
    expect(getByText('item-0')).toBeOnTheScreen();
    expect(getByText('item-1')).toBeOnTheScreen();
  });

  it('renders the empty state when ready with no items', () => {
    const { getByTestId, queryByTestId } = renderComponent(readyState(0));

    expect(getByTestId('defi-empty-state')).toBeOnTheScreen();
    expect(
      queryByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_LIST),
    ).toBeNull();
  });

  it('renders a scroll view with pull-to-refresh in full view', () => {
    const { getByTestId } = renderComponent(readyState(1), {
      isFullView: true,
    });

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW),
    ).toBeOnTheScreen();
  });

  it('invokes onRefresh when pulled to refresh in full view', () => {
    const onRefresh = jest.fn();
    const { getByTestId } = renderComponent(readyState(1), {
      isFullView: true,
      onRefresh,
    });

    const scrollView = getByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
    );
    // Trigger the pull-to-refresh handler wired onto the ScrollView.
    scrollView.props.refreshControl.props.onRefresh();

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('tracks the position screen viewed event once when ready in full view', () => {
    renderComponent(readyState(3), { isFullView: true });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.POSITION_SCREEN_VIEWED,
      )
        .addProperties({
          item_count: 3,
          location: 'homepage',
          is_empty: false,
          screen_type: 'defi',
        })
        .build(),
    );
  });

  it('reports is_empty when ready with no items', () => {
    renderComponent(readyState(0), { isFullView: true });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.POSITION_SCREEN_VIEWED,
      )
        .addProperties({
          item_count: 0,
          location: 'homepage',
          is_empty: true,
          screen_type: 'defi',
        })
        .build(),
    );
  });

  it('does not track the screen viewed event when not in full view', () => {
    renderComponent(readyState(2), { isFullView: false });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not track the screen viewed event while loading', () => {
    renderComponent({ status: 'loading' }, { isFullView: true });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
