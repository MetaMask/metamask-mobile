/**
 * Component view tests for PerpsHeroCardView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsHeroCardView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { PerpsHeroCardViewSelectorsIDs } from '../../Perps.testIds';
import { renderPerpsHeroCardView } from 'tests/component-view/renderers/perpsViewRenderer';

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
