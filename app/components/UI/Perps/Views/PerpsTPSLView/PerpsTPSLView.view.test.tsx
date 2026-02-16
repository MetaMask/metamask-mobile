/**
 * Component view tests for PerpsTPSLView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTPSLView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsTPSLView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsTPSLViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsTPSLView', () => {
  it('renders back button and bottom sheet when params are provided', async () => {
    renderPerpsTPSLView();

    expect(
      await screen.findByTestId(PerpsTPSLViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET),
    ).toBeOnTheScreen();
  });

  it('renders set button', async () => {
    renderPerpsTPSLView();

    expect(
      await screen.findByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
    ).toBeOnTheScreen();
  });
});
