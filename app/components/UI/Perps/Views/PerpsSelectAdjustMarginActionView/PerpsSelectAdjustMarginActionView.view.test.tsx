/**
 * Component view tests for PerpsSelectAdjustMarginActionView.
 * Covers: PerpsSelectAdjustMarginActionView + PerpsAdjustMarginActionSheet (rendered inside).
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsSelectAdjustMarginActionView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsSelectAdjustMarginActionView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

describe('PerpsSelectAdjustMarginActionView', () => {
  it('renders adjust margin title from PerpsAdjustMarginActionSheet', async () => {
    renderPerpsSelectAdjustMarginActionView();

    expect(
      await screen.findByText(strings('perps.adjust_margin.title')),
    ).toBeOnTheScreen();
  });

  it('shows both Add Margin and Remove Margin options with descriptions', async () => {
    renderPerpsSelectAdjustMarginActionView();

    expect(
      await screen.findByText(strings('perps.adjust_margin.add_margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.add_margin_description')),
    ).toBeOnTheScreen();

    expect(
      screen.getByText(strings('perps.adjust_margin.reduce_margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.adjust_margin.reduce_margin_description'),
      ),
    ).toBeOnTheScreen();
  });

  it('Add Margin option is pressable', async () => {
    renderPerpsSelectAdjustMarginActionView();

    const addMarginOption = await screen.findByText(
      strings('perps.adjust_margin.add_margin'),
    );
    fireEvent.press(addMarginOption);
  });

  it('Remove Margin option is pressable', async () => {
    renderPerpsSelectAdjustMarginActionView();

    const removeMarginOption = await screen.findByText(
      strings('perps.adjust_margin.reduce_margin'),
    );
    fireEvent.press(removeMarginOption);
  });
});
