import '../../../../../../tests/component-view/mocks';

import type React from 'react';
import { type CrossLiquidationEstimate } from '@metamask/perps-controller';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
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

const mockCrossLiquidationEstimate = (estimate: CrossLiquidationEstimate) => {
  jest
    .mocked(Engine.context.PerpsController.estimateCrossLiquidation)
    .mockResolvedValue(estimate);
};

const enterCrossOrderSize = async () => {
  fireEvent.changeText(await screen.findByTestId(formIds.SIZE_INPUT), '100');
  fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
};

describeForPlatforms('Pro Cross margin risk editors', () => {
  beforeEach(() => {
    resetMarginModeControllerMocks();
    jest
      .mocked(Engine.context.PerpsController.estimateCrossLiquidation)
      .mockReset()
      .mockResolvedValue({ status: 'unavailable', reason: 'provider' });
  });
  afterEach(() => {
    cleanup();
    unwire?.();
    unwire = undefined;
    jest.restoreAllMocks();
    jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockReset()
      .mockResolvedValue('0.00');
    jest.clearAllMocks();
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

  it('shows the controller cross liquidation price on the summary row', async () => {
    mockCrossLiquidationEstimate({
      status: 'price',
      price: '2183.6007130124776',
    });
    await selectCross();
    await enterCrossOrderSize();

    await waitFor(() =>
      expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
        /\$2,183\.6/,
      ),
    );
    expect(
      Engine.context.PerpsController.estimateCrossLiquidation,
    ).toHaveBeenCalled();
  });

  it('shows no liquidation price when a cross order cannot be liquidated', async () => {
    mockCrossLiquidationEstimate({
      status: 'none',
      reason: 'covered_by_account',
    });
    await selectCross();
    await enterCrossOrderSize();

    await waitFor(() =>
      expect(
        within(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).getByText(
          strings('perps.cross_position.no_liquidation_price'),
        ),
      ).toBeOnTheScreen(),
    );
  });
});
