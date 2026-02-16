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
  it('renders container and back button when market is provided', async () => {
    renderPerpsOrderBookView();

    expect(
      await screen.findByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsOrderBookViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders scroll view and depth chart area', async () => {
    renderPerpsOrderBookView();

    expect(
      await screen.findByTestId(PerpsOrderBookViewSelectorsIDs.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsOrderBookViewSelectorsIDs.DEPTH_CHART),
    ).toBeOnTheScreen();
  });
});
