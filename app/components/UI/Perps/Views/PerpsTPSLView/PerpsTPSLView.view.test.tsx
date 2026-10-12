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
import Engine from '../../../../../core/Engine';

describe('PerpsTPSLView', () => {
  afterEach(() => {
    cleanup();
    jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockReset()
      .mockResolvedValue('0.00');
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
      // The form only submits against a position the live stream still holds.
      streamOverrides: { positions: [position] },
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

  it('keeps isolated stop validation against the liquidation estimate for new orders', async () => {
    jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockResolvedValue('2100');
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderPerpsTPSLView({
      initialParams: {
        asset: 'ETH',
        currentPrice: 2500,
        direction: 'long',
        position: undefined,
        leverage: 3,
        marginMode: 'isolated',
        onConfirm,
      },
    });
    await waitFor(() =>
      expect(
        Engine.context.PerpsController.calculateLiquidationPrice,
      ).toHaveBeenCalled(),
    );

    fireEvent.changeText(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
      ),
      '2000',
    );

    await waitFor(() =>
      expect(
        screen.getByTestId(PerpsTPSLViewSelectorsIDs.SET_BUTTON),
      ).toBeDisabled(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
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
      // The form only submits against a position the live stream still holds.
      streamOverrides: { positions: [position] },
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

  it('renders RoE sign badges at default + take profit and - stop loss', async () => {
    renderPerpsTPSLView();

    expect(
      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_ROE_SIGN_BADGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE),
    ).toHaveAccessibilityValue({ text: '+' });
    expect(
      screen.getByTestId(PerpsTPSLViewSelectorsIDs.STOP_LOSS_ROE_SIGN_BADGE),
    ).toHaveAccessibilityValue({ text: '-' });
  });

  it('flips the take profit RoE badge from + to - on press', async () => {
    renderPerpsTPSLView();

    const tpBadge = await screen.findByTestId(
      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE,
      {},
      { timeout: 10000 },
    );

    fireEvent.press(tpBadge);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE,
        ),
      ).toHaveAccessibilityValue({ text: '-' });
    });
  });

  describe('sheet variant', () => {
    const position = {
      ...defaultPositionForViews,
      entryPrice: '2500',
      liquidationPrice: '2100',
    };

    const renderSheet = (onConfirm = jest.fn().mockResolvedValue(undefined)) =>
      renderPerpsTPSLView({
        variant: 'sheet',
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
        // The form only submits against a position the live stream still holds.
        streamOverrides: { positions: [position] },
      });

    it('renders only the Save action in the sheet header and footer', async () => {
      renderSheet();

      expect(
        await screen.findByTestId(
          PerpsTPSLViewSelectorsIDs.SET_BUTTON,
          {},
          { timeout: 10000 },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsTPSLViewSelectorsIDs.BACK_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsTPSLViewSelectorsIDs.CANCEL_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('sets a stop loss from the sheet', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderSheet(onConfirm);

      fireEvent.changeText(
        await screen.findByTestId(
          PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
          {},
          { timeout: 10000 },
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

    it('shows the liquidation distance the control arm does not', async () => {
      renderSheet();

      expect(
        await screen.findByTestId(
          PerpsTPSLViewSelectorsIDs.LIQUIDATION_DISTANCE,
          {},
          { timeout: 10000 },
        ),
      ).toBeOnTheScreen();

      cleanup();
      renderPerpsTPSLView({ initialParams: { position } });

      await screen.findByTestId(
        PerpsTPSLViewSelectorsIDs.SET_BUTTON,
        {},
        { timeout: 10000 },
      );
      expect(
        screen.queryByTestId(PerpsTPSLViewSelectorsIDs.LIQUIDATION_DISTANCE),
      ).toBeNull();
    });
  });
});
