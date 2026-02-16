/**
 * Component view tests for PerpsClosePositionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsClosePositionView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsClosePositionView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsClosePositionViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsClosePositionView', () => {
  it('renders close position confirm and cancel buttons', async () => {
    renderPerpsClosePositionView();

    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CANCEL_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('renders display toggle and fee tooltip buttons', async () => {
    renderPerpsClosePositionView();

    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.FEES_TOOLTIP_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('shows close position title', async () => {
    renderPerpsClosePositionView();

    expect(
      await screen.findByText(strings('perps.close_position.title')),
    ).toBeOnTheScreen();
  });
});
