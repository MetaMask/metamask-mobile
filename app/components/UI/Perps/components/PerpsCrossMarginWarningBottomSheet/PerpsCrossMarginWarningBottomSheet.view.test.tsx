/**
 * Component view tests for PerpsCrossMarginWarningBottomSheet.
 * Verifies the bottom sheet renders its title, message, and dismiss button.
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsCrossMarginWarningBottomSheet.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsCrossMarginWarningView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

describe('PerpsCrossMarginWarningBottomSheet', () => {
  it('renders title, message, and dismiss button', async () => {
    renderPerpsCrossMarginWarningView();

    expect(
      await screen.findByText(strings('perps.crossMargin.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.crossMargin.message')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.crossMargin.dismiss')),
    ).toBeOnTheScreen();
  });

  it('dismiss button is pressable', async () => {
    renderPerpsCrossMarginWarningView();

    const dismissButton = await screen.findByText(
      strings('perps.crossMargin.dismiss'),
    );
    fireEvent.press(dismissButton);
  });
});
