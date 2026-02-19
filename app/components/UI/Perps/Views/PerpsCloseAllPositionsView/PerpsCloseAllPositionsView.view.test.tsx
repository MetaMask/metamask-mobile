/**
 * Component view tests for PerpsCloseAllPositionsView.
 * Covers: PerpsCloseAllPositionsView + PerpsCloseSummary (rendered inside when positions exist).
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsCloseAllPositionsView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderPerpsCloseAllPositionsView,
  defaultPositionForViews,
} from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

const multiplePositions = [
  defaultPositionForViews,
  {
    ...defaultPositionForViews,
    symbol: 'BTC',
    size: '0.5',
    entryPrice: '40000',
    liquidationPrice: '38000',
    unrealizedPnl: '-200',
    positionValue: '20000',
  },
];

describe('PerpsCloseAllPositionsView', () => {
  describe('empty state', () => {
    it('shows title and no-positions message when stream has no positions', async () => {
      renderPerpsCloseAllPositionsView({
        streamOverrides: { positions: [] },
      });

      expect(
        await screen.findByText(strings('perps.close_all_modal.title')),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(strings('perps.position.no_positions')),
      ).toBeOnTheScreen();
    });
  });

  describe('with positions', () => {
    it('shows title, description, and action buttons when positions exist', async () => {
      renderPerpsCloseAllPositionsView({
        streamOverrides: { positions: [defaultPositionForViews] },
      });

      expect(
        await screen.findByText(strings('perps.close_all_modal.title')),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(strings('perps.close_all_modal.description')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.close_all_modal.keep_positions')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.close_all_modal.close_all')),
      ).toBeOnTheScreen();
    });

    it('renders PerpsCloseSummary with margin and receive labels for multiple positions', async () => {
      renderPerpsCloseAllPositionsView({
        streamOverrides: { positions: multiplePositions },
      });

      expect(
        await screen.findByText(strings('perps.close_all_modal.description')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.close_all_modal.margin')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.close_all_modal.receive')),
      ).toBeOnTheScreen();
    });

    it('does not show empty state text when positions are present', async () => {
      renderPerpsCloseAllPositionsView({
        streamOverrides: { positions: [defaultPositionForViews] },
      });

      await screen.findByText(strings('perps.close_all_modal.title'));

      expect(
        screen.queryByText(strings('perps.position.no_positions')),
      ).not.toBeOnTheScreen();
    });
  });
});
