/**
 * Component view tests for PerpsLeverageBottomSheet.
 * Tests rendering of leverage UI elements: title, leverage display, quick-select buttons, and set button.
 * Wrapped via renderPerpsView to provide navigation context required by BottomSheet.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsLeverageBottomSheet.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import React from 'react';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import PerpsLeverageBottomSheet from './PerpsLeverageBottomSheet';

const LeverageSheetWrapper: React.FC = () => (
  <PerpsLeverageBottomSheet
    isVisible
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    leverage={5}
    minLeverage={1}
    maxLeverage={50}
    currentPrice={2000}
    direction="long"
    asset="ETH"
  />
);

const HiddenLeverageWrapper: React.FC = () => (
  <PerpsLeverageBottomSheet
    isVisible={false}
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    leverage={5}
    minLeverage={1}
    maxLeverage={50}
    currentPrice={2000}
    direction="long"
    asset="ETH"
  />
);

describe('PerpsLeverageBottomSheet', () => {
  it('renders leverage title and current leverage display', async () => {
    renderPerpsView(LeverageSheetWrapper, 'LeverageTest');

    expect(
      await screen.findByText(strings('perps.order.leverage_modal.title')),
    ).toBeOnTheScreen();
    const fiveXElements = screen.getAllByText('5x');
    expect(fiveXElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders set leverage footer button', async () => {
    renderPerpsView(LeverageSheetWrapper, 'LeverageTest');

    expect(
      await screen.findByText(
        strings('perps.order.leverage_modal.set_leverage', { leverage: 5 }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders quick-select preset buttons (2x, 10x)', async () => {
    renderPerpsView(LeverageSheetWrapper, 'LeverageTest');

    await screen.findByText(strings('perps.order.leverage_modal.title'));

    expect(screen.getByText('2x')).toBeOnTheScreen();
    expect(screen.getByText('10x')).toBeOnTheScreen();
  });

  it('does not render when isVisible is false', () => {
    renderPerpsView(HiddenLeverageWrapper, 'LeverageTest');

    expect(
      screen.queryByText(strings('perps.order.leverage_modal.title')),
    ).not.toBeOnTheScreen();
  });
});
