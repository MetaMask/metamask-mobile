/**
 * Component view tests for PerpsPositionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsPositionsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsPositionsViewSelectorsIDs } from '../../Perps.testIds';

const shortPosition = {
  ...defaultPositionForViews,
  symbol: 'BTC',
  size: '-0.05',
  marginUsed: '1000',
  entryPrice: '60000',
  unrealizedPnl: '-100',
};

describe('PerpsPositionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the positions screen title', async () => {
    renderPerpsPositionsView();

    expect(
      await screen.findByText(strings('perps.position.title')),
    ).toBeOnTheScreen();
  });

  it('shows empty state when there are no positions', async () => {
    renderPerpsPositionsView({ streamOverrides: { positions: [] } });

    expect(
      await screen.findByText(strings('perps.position.list.empty_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.list.empty_description')),
    ).toBeOnTheScreen();
  });

  it('shows position list when a position exists in stream', async () => {
    renderPerpsPositionsView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(
      await screen.findByTestId(
        PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION,
      ),
    ).toBeOnTheScreen();
  });

  it('shows account summary section with balance labels', async () => {
    renderPerpsPositionsView();

    expect(
      await screen.findByText(strings('perps.position.account.summary_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.account.total_balance')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.account.available_balance')),
    ).toBeOnTheScreen();
  });

  it('shows open positions count for a single position', async () => {
    renderPerpsPositionsView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(
      await screen.findByText(
        strings('perps.position.list.position_count', { count: 1 }),
      ),
    ).toBeOnTheScreen();
  });

  it('shows plural position count for two positions', async () => {
    renderPerpsPositionsView({
      streamOverrides: {
        positions: [defaultPositionForViews, shortPosition],
      },
    });

    expect(
      await screen.findByText(
        strings('perps.position.list.position_count_plural', { count: 2 }),
      ),
    ).toBeOnTheScreen();
  });
});
