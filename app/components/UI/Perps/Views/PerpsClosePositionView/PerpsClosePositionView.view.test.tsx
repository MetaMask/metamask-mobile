/**
 * Component view tests for PerpsClosePositionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsClosePositionView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsClosePositionView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsOrderHeaderSelectorsIDs } from '../../Perps.testIds';

describe('PerpsClosePositionView', () => {
  it('renders close position screen with order header', async () => {
    renderPerpsClosePositionView();

    expect(
      await screen.findByTestId(
        PerpsOrderHeaderSelectorsIDs.HEADER,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
  });
});
