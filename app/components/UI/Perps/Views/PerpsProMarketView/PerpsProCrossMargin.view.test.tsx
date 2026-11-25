import '../../../../../../tests/component-view/mocks';

import type React from 'react';
import type { CrossLiquidationEstimate } from '@metamask/perps-controller';
import { createDeferredPromise } from '@metamask/utils';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { renderPerpsCrossMarginOrderFormPanel } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createCrossMarginAccountForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
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
  const { store, stream } = renderPerpsCrossMarginOrderFormPanel({
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
  return stream;
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

  it('keeps the Cross estimate during a quote refresh but not after the size is edited', async () => {
    const estimate = jest.mocked(
      Engine.context.PerpsController.estimateCrossLiquidation,
    );
    estimate.mockResolvedValue({ status: 'price', price: '1842' });
    const stream = await selectCross();
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

    let releaseQuote!: () => void;
    const pendingQuote = new Promise<void>((resolve) => {
      releaseQuote = resolve;
    });
    estimate.mockImplementation(async () => {
      await pendingQuote;
      return { status: 'price', price: '1850' };
    });
    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2600',
          markPrice: '2600',
          timestamp: 2,
          isTradable: true,
        },
      });
    });
    await waitFor(() =>
      expect(estimate).toHaveBeenCalledWith(
        expect.objectContaining({ entryPrice: '2600' }),
      ),
    );
    expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
      /\$1,842/,
    );
    await act(async () => releaseQuote());
    await waitFor(() =>
      expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
        /\$1,850/,
      ),
    );

    fireEvent.changeText(screen.getByTestId(formIds.SIZE_INPUT), '200');
    expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
      /--/,
    );
  });

  it('does not request another Cross estimate when only the account stream changes', async () => {
    const pending = createDeferredPromise<CrossLiquidationEstimate>();
    const estimate = jest
      .mocked(Engine.context.PerpsController.estimateCrossLiquidation)
      .mockReturnValue(pending.promise);
    const stream = await selectCross();
    fireEvent.changeText(await screen.findByTestId(formIds.SIZE_INPUT), '100');
    fireEvent(screen.getByTestId(formIds.SIZE_INPUT), 'blur');
    await waitFor(() => expect(estimate).toHaveBeenCalledTimes(1));

    act(() => {
      stream.emitAccount(
        createCrossMarginAccountForViews({
          balance: '10000',
          accountValue: '10020',
          maintenanceMargin: '5',
          marginUsed: '100',
          notional: '500',
        }),
      );
    });
    await act(async () => pending.resolve({ status: 'price', price: '1842' }));

    await waitFor(() =>
      expect(screen.getByTestId(formIds.SUMMARY_LIQUIDATION)).toHaveTextContent(
        /\$1,842/,
      ),
    );
    expect(estimate).toHaveBeenCalledTimes(1);
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
