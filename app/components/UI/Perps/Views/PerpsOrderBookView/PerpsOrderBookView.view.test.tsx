/**
 * Component view tests for PerpsOrderBookView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsOrderBookView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { PerpsOrderBookViewSelectorsIDs } from '../../Perps.testIds';
import { renderPerpsOrderBookView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

describe('PerpsOrderBookView', () => {
  it('renders order book container when market is provided', async () => {
    renderPerpsOrderBookView();

    expect(
      await screen.findByTestId(
        PerpsOrderBookViewSelectorsIDs.CONTAINER,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
  });
});
