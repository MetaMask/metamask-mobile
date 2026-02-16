/**
 * Component view tests for PerpsHomeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsHomeView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { renderPerpsHomeView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsHomeView', () => {
  it('renders balance actions and scroll content when connected', async () => {
    renderPerpsHomeView();

    expect(
      await screen.findByTestId(PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsHomeViewSelectorsIDs.SCROLL_CONTENT),
    ).toBeOnTheScreen();
  });

  it('renders back button', async () => {
    renderPerpsHomeView();

    expect(
      await screen.findByTestId(PerpsHomeViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
  });
});
