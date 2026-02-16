/**
 * Component view tests for PerpsWithdrawView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsWithdrawView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsWithdrawView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsWithdrawViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsWithdrawView', () => {
  it('renders withdrawal screen with header back button', async () => {
    renderPerpsWithdrawView();

    expect(
      await screen.findByTestId(
        PerpsWithdrawViewSelectorsIDs.BACK_BUTTON,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
  });
});
