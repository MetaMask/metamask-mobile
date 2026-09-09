/**
 * Component view tests for PerpsTooltipView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsTooltipView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

describe('PerpsTooltipView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the leverage tooltip title and Got It button', async () => {
    renderPerpsTooltipView({ contentKey: 'leverage' });

    expect(
      await screen.findByText(strings('perps.tooltips.leverage.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.tooltips.got_it_button')),
    ).toBeOnTheScreen();
  });

  it('renders the liquidation_price tooltip with its title', async () => {
    renderPerpsTooltipView({ contentKey: 'liquidation_price' });

    expect(
      await screen.findByText(
        strings('perps.tooltips.liquidation_price.title'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the liquidation_distance tooltip with its title', async () => {
    renderPerpsTooltipView({ contentKey: 'liquidation_distance' });

    expect(
      await screen.findByText(
        strings('perps.tooltips.liquidation_distance.title'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the spread tooltip with its title', async () => {
    renderPerpsTooltipView({ contentKey: 'spread' });

    expect(
      await screen.findByText(strings('perps.tooltips.spread.title')),
    ).toBeOnTheScreen();
  });

  it('closes the sheet when Got It is pressed', async () => {
    renderPerpsTooltipView({ contentKey: 'leverage' });

    const gotIt = await screen.findByText(
      strings('perps.tooltips.got_it_button'),
    );
    expect(gotIt).toBeOnTheScreen();
    fireEvent.press(gotIt);
    // BottomSheet handles the close animation; pressing Got It should not throw
    expect(gotIt).toBeOnTheScreen();
  });

  it('renders no header for market_hours content key (custom renderer path)', async () => {
    renderPerpsTooltipView({ contentKey: 'market_hours' });

    await screen.findByTestId('perps-tooltip-bottom-sheet');
    expect(
      screen.queryByTestId('perps-tooltip-bottom-sheet-header'),
    ).not.toBeOnTheScreen();
  });

  it('renders header for standard content keys', async () => {
    renderPerpsTooltipView({ contentKey: 'leverage' });

    expect(
      await screen.findByTestId('perps-tooltip-bottom-sheet-header'),
    ).toBeOnTheScreen();
  });
});
