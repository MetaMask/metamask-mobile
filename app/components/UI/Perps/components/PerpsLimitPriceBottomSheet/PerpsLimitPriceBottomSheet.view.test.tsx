/**
 * Component view tests for PerpsLimitPriceBottomSheet.
 * Tests rendering of limit price UI: title, set button, and presets.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsLimitPriceBottomSheet.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsComponent } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsLimitPriceBottomSheet from './PerpsLimitPriceBottomSheet';

const renderLimitPriceSheet = (props: Record<string, unknown> = {}) =>
  renderPerpsComponent(
    PerpsLimitPriceBottomSheet as unknown as React.ComponentType<
      Record<string, unknown>
    >,
    {
      isVisible: true,
      onClose: jest.fn(),
      onConfirm: jest.fn(),
      asset: 'ETH',
      currentPrice: '2000',
      direction: 'long',
      ...props,
    },
  );

describe('PerpsLimitPriceBottomSheet', () => {
  it('renders title and set button', async () => {
    renderLimitPriceSheet();

    expect(
      await screen.findByText(strings('perps.order.limit_price_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.set')),
    ).toBeOnTheScreen();
  });

  it('renders price preset buttons for long direction', async () => {
    renderLimitPriceSheet({ direction: 'long' });

    await screen.findByText(strings('perps.order.limit_price_modal.title'));

    expect(
      screen.getByText(strings('perps.order.limit_price_modal.mid_price')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.bid_price')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.ask_price')),
    ).not.toBeOnTheScreen();
  });

  it('renders ask preset button for short direction', async () => {
    renderLimitPriceSheet({ direction: 'short' });

    await screen.findByText(strings('perps.order.limit_price_modal.title'));

    expect(
      screen.getByText(strings('perps.order.limit_price_modal.mid_price')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.ask_price')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.bid_price')),
    ).not.toBeOnTheScreen();
  });

  it('does not render when isVisible is false', () => {
    renderLimitPriceSheet({ isVisible: false });

    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.title')),
    ).not.toBeOnTheScreen();
  });
});
