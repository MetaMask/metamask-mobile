/**
 * Component view tests for PerpsTooltipView.
 * Tests different tooltip content keys rendering their title, content, and Got it button.
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTooltipView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsTooltipView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';

describe('PerpsTooltipView', () => {
  it('renders leverage tooltip with title, content, and Got it button', async () => {
    renderPerpsTooltipView({ contentKey: 'leverage' });

    expect(
      await screen.findByText(strings('perps.tooltips.leverage.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.tooltips.got_it_button')),
    ).toBeOnTheScreen();
  });

  it('renders margin tooltip with correct title', async () => {
    renderPerpsTooltipView({ contentKey: 'margin' });

    expect(
      await screen.findByText(strings('perps.tooltips.margin.title')),
    ).toBeOnTheScreen();
  });

  it('renders fees tooltip with correct title', async () => {
    renderPerpsTooltipView({ contentKey: 'fees' });

    expect(
      await screen.findByText(strings('perps.tooltips.fees.title')),
    ).toBeOnTheScreen();
  });

  it('renders liquidation_price tooltip with correct title', async () => {
    renderPerpsTooltipView({ contentKey: 'liquidation_price' });

    expect(
      await screen.findByText(
        strings('perps.tooltips.liquidation_price.title'),
      ),
    ).toBeOnTheScreen();
  });

  it('Got it button is pressable and dismisses the tooltip', async () => {
    renderPerpsTooltipView({ contentKey: 'leverage' });

    const gotItButton = await screen.findByText(
      strings('perps.tooltips.got_it_button'),
    );
    fireEvent.press(gotItButton);
  });

  it('renders custom content for fees tooltip via content registry', async () => {
    renderPerpsTooltipView({ contentKey: 'fees' });

    expect(
      await screen.findByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
    ).toBeOnTheScreen();
  });
});
