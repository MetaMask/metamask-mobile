/**
 * Component view tests for PerpsCloseAllPositionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsCloseAllPositionsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

const positions: Position[] = [
  defaultPositionForViews,
  {
    ...defaultPositionForViews,
    symbol: 'BTC',
    size: '0.2',
    marginUsed: '800',
    entryPrice: '50000',
    liquidationPrice: '45000',
    unrealizedPnl: '-50',
    returnOnEquity: '-0.05',
    positionValue: '10000',
  },
];

describe('PerpsCloseAllPositionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms closing all open positions from the bulk close sheet', async () => {
    const closePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;

    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
    });

    expect(
      await screen.findByText(strings('perps.close_all_modal.title')),
    ).toBeOnTheScreen();
    // Literal copy rather than `strings(...)`: asserting against the same call
    // the component makes would pass even if pluralization resolved to nothing.
    expect(
      screen.getByText(
        "We'll close your 2 open positions at current market price.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_position.margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_position.you_receive')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(
        strings('perps.close_all_modal.close_count', {
          count: positions.length,
        }),
      ),
    );

    await waitFor(() => {
      expect(closePositions).toHaveBeenCalledWith({
        symbols: positions.map((p) => p.symbol),
      });
    });
  });

  it('drops the count and singularises the copy for a lone position', async () => {
    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: [positions[0]] },
    });

    expect(
      await screen.findByText(
        "We'll close your open position at current market price.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Close (1)')).toBeOnTheScreen();
  });

  it('does not expose the close action when there are no open positions', async () => {
    const closePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;

    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: [] },
    });

    expect(
      await screen.findByText(strings('perps.position.no_positions')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('perps.close_all_modal.close_count', { count: 0 }),
      ),
    ).not.toBeOnTheScreen();
    expect(closePositions).not.toHaveBeenCalled();
  });
});
