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
  it('renders back button and source token area', async () => {
    renderPerpsWithdrawView();

    expect(
      await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsWithdrawViewSelectorsIDs.SOURCE_TOKEN_AREA,
      ),
    ).toBeOnTheScreen();
  });

  it('renders destination token area and continue button', async () => {
    renderPerpsWithdrawView();

    expect(
      await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.DEST_TOKEN_AREA),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });
});
