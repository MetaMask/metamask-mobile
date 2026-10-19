import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MarketInfo } from '@metamask/perps-controller';
import Engine from '../../../app/core/Engine';
import {
  PerpsMarginModeBottomSheetSelectorsIDs as marginIds,
  PerpsProOrderFormSelectorsIDs as formIds,
} from '../../../app/components/UI/Perps/Perps.testIds';

export const crossMarginMarketInfo: MarketInfo = {
  name: 'ETH',
  maxLeverage: 40,
  szDecimals: 2,
  marginTableId: 1,
  providerId: 'hyperliquid',
};

/** Reset every Engine implementation modified by the margin-mode journeys. */
export function resetMarginModeControllerMocks() {
  const controller = Engine.context.PerpsController;
  jest
    .mocked(controller.getMarkets)
    .mockReset()
    .mockResolvedValue([crossMarginMarketInfo]);
  jest.mocked(controller.getMarginModeLock).mockReset().mockResolvedValue({
    status: 'unlocked',
    providerId: 'hyperliquid',
  });
  jest
    .mocked(controller.calculateLiquidationPrice)
    .mockReset()
    .mockResolvedValue('2000');
  jest
    .mocked(controller.validateOrder)
    .mockReset()
    .mockResolvedValue({ isValid: true });
  jest.mocked(controller.placeOrder).mockReset().mockResolvedValue({
    success: true,
    orderId: 'cross-margin-view-order',
  });
}

/** Settle the initial read before opening a sheet that requests a fresh lock. */
export async function openMarginModeSheet(waitForLock = true) {
  await waitFor(() =>
    expect(Engine.context.PerpsController.getMarkets).toHaveBeenCalled(),
  );
  await act(async () => {
    await Promise.all(
      jest
        .mocked(Engine.context.PerpsController.getMarkets)
        .mock.results.map(({ value }) => value),
    );
  });
  jest.mocked(Engine.context.PerpsController.getMarginModeLock).mockClear();

  fireEvent.press(await screen.findByTestId(formIds.MARGIN_MODE_BUTTON));

  await screen.findByTestId(marginIds.CONTAINER);
  if (waitForLock) {
    await act(async () => {
      await Promise.all(
        jest
          .mocked(Engine.context.PerpsController.getMarginModeLock)
          .mock.results.map(({ value }) => value),
      );
    });
  }
}
