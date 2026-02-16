/**
 * Component view tests for PerpsHeroCardView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsHeroCardView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsHeroCardView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import {
  PerpsHeroCardViewSelectorsIDs,
  getPerpsHeroCardViewSelector,
} from '../../Perps.testIds';

describe('PerpsHeroCardView', () => {
  it('renders container and header when position is provided', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByTestId(PerpsHeroCardViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsHeroCardViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
  });

  it('renders close button and asset symbol', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByTestId(PerpsHeroCardViewSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(getPerpsHeroCardViewSelector.assetSymbol(0)),
    ).toBeOnTheScreen();
  });
});
