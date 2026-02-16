/**
 * Component view tests for PerpsPositionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsPositionsView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderPerpsPositionsView,
  defaultPositionForViews,
} from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsPositionsViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsPositionsView', () => {
  it('renders back button and account summary when connected', async () => {
    renderPerpsPositionsView({ streamOverrides: { positions: [] } });

    expect(
      await screen.findByTestId(PerpsPositionsViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.account.summary_title')),
    ).toBeOnTheScreen();
  });

  it('shows empty state when there are no positions', async () => {
    renderPerpsPositionsView({ streamOverrides: { positions: [] } });

    expect(
      await screen.findByText(strings('perps.position.list.empty_title')),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.list.empty_description')),
    ).toBeOnTheScreen();
  });

  it('shows positions section and position item when positions exist', async () => {
    renderPerpsPositionsView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(
      await screen.findByTestId(
        PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION,
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.list.open_positions')),
    ).toBeOnTheScreen();
  });
});
