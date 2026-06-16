/**
 * Component view tests for PerpsTPSLView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsTPSLView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  defaultPositionForViews,
  renderPerpsTPSLView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsTPSLViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsTPSLView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders back button, TPSL screen container, and Set button when params are provided', async () => {
    renderPerpsTPSLView();

    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.BACK_BUTTON,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.SET_BUTTON,
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
  });

  it('sets a stop loss for an existing long position', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const position = {
      ...defaultPositionForViews,
      entryPrice: '2500',
      liquidationPrice: '2100',
    };

    renderPerpsTPSLView({
      initialParams: {
        asset: 'ETH',
        currentPrice: '2500',
        direction: 'long',
        position,
        initialTakeProfitPrice: '',
        initialStopLossPrice: '',
        leverage: 3,
        orderType: 'market',
        limitPrice: '',
        amount: '1',
        szDecimals: 2,
        onConfirm,
      },
    });

    fireEvent.changeText(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
      ),
      '2300',
    );
    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        position,
        undefined,
        '2300',
        expect.objectContaining({ direction: 'long' }),
      );
    });
  });

  it('sets a custom take profit for an existing long position', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const position = {
      ...defaultPositionForViews,
      entryPrice: '2500',
      liquidationPrice: '2100',
    };

    renderPerpsTPSLView({
      initialParams: {
        asset: 'ETH',
        currentPrice: '2500',
        direction: 'long',
        position,
        initialTakeProfitPrice: '',
        initialStopLossPrice: '',
        leverage: 3,
        orderType: 'market',
        limitPrice: '',
        amount: '1',
        szDecimals: 2,
        onConfirm,
      },
    });

    fireEvent.changeText(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
      ),
      '2800',
    );
    fireEvent.press(screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        position,
        '2800',
        undefined,
        expect.objectContaining({ direction: 'long' }),
      );
    });
  });
});
