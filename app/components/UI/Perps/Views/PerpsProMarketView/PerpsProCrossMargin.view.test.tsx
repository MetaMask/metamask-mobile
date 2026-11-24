import '../../../../../../tests/component-view/mocks';

import type React from 'react';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { renderPerpsCrossMarginOrderFormPanel } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { createFundedAccountForViews } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { wirePerpsControllerForStore } from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import {
  openMarginModeSheet,
  resetMarginModeControllerMocks,
  selectCrossMarginMode,
} from '../../../../../../tests/component-view/helpers/perpsMarginModeTestHelpers';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  PerpsProOrderFormSelectorsIDs as formIds,
  PerpsTPSLViewSelectorsIDs as tpslIds,
} from '../../Perps.testIds';
import PerpsTPSLView from '../PerpsTPSLView/PerpsTPSLView';

let unwire: (() => void) | undefined;

const selectCross = async () => {
  const { store } = renderPerpsCrossMarginOrderFormPanel({
    streamOverrides: {
      positions: [],
      orders: [],
      account: createFundedAccountForViews('10000'),
    },
    extraRoutes: [
      {
        name: Routes.PERPS.TPSL,
        Component: PerpsTPSLView as React.ComponentType<unknown>,
      },
    ],
  });
  unwire = wirePerpsControllerForStore(store);
  await openMarginModeSheet();
  await selectCrossMarginMode();
  await waitFor(() =>
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    ),
  );
};

describeForPlatforms('Pro Cross margin risk editors', () => {
  beforeEach(resetMarginModeControllerMocks);
  afterEach(() => {
    cleanup();
    unwire?.();
    unwire = undefined;
    jest.restoreAllMocks();
    jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockReset()
      .mockResolvedValue('0.00');
    jest
      .mocked(Engine.context.PerpsController.estimateCrossLiquidation)
      .mockReset()
      .mockResolvedValue({ status: 'unavailable', reason: 'missing_inputs' });
    jest.clearAllMocks();
  });

  it('shows the venue’s Cross liquidation price after the trader enters a size', async () => {
    const estimate = jest.mocked(
      Engine.context.PerpsController.estimateCrossLiquidation,
    );
    estimate.mockResolvedValue({ status: 'price', price: '1842' });
    await selectCross();
    fireEvent.changeText(await screen.findByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(() =>
      expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
        /\$1,842/,
      ),
    );
    expect(estimate).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'ETH',
        direction: 'long',
        providerId: 'hyperliquid',
      }),
    );
  });

  it('saves a Cross stop beyond the isolated liquidation threshold after opening TP/SL', async () => {
    await selectCross();
    fireEvent.press(screen.getByTestId(formIds.TPSL));

    fireEvent.changeText(
      await screen.findByTestId(tpslIds.STOP_LOSS_PRICE_INPUT),
      '1900',
    );
    await waitFor(() =>
      expect(screen.getByTestId(tpslIds.SET_BUTTON)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(tpslIds.SET_BUTTON));

    fireEvent.press(await screen.findByTestId(formIds.TPSL));
    await waitFor(() =>
      expect(screen.getByTestId(tpslIds.STOP_LOSS_PRICE_INPUT)).toHaveProp(
        'value',
        '1900',
      ),
    );
  });
});
