/**
 * Component view tests for PerpsTPSLView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTPSLView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsTPSLView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsTPSLViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsTPSLView', () => {
  it('renders back button, TPSL screen container, and Set button when params are provided', async () => {
    renderPerpsTPSLView();

    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.BACK_BUTTON,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.SET_BUTTON,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
  });
});
