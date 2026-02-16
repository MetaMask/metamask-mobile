/**
 * Component view tests for PerpsOrderBookView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsOrderBookView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsOrderBookView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsOrderBookViewSelectorsIDs } from '../../Perps.testIds';

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
