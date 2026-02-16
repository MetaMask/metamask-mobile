/**
 * Component view tests for PerpsHeroCardView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsHeroCardView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsHeroCardView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsHeroCardViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsHeroCardView', () => {
  it('renders container when position is provided', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByTestId(
        PerpsHeroCardViewSelectorsIDs.CONTAINER,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
  });
});
