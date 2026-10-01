import '../../../../../../tests/component-view/mocks';

import type React from 'react';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { renderPerpsProMarketView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { createFundedAccountForViews } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { wirePerpsControllerForStore } from '../../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  PerpsLeverageBottomSheetSelectorsIDs as leverageIds,
  PerpsMarginModeBottomSheetSelectorsIDs as marginIds,
  PerpsProOrderFormSelectorsIDs as formIds,
  PerpsTPSLViewSelectorsIDs as tpslIds,
} from '../../Perps.testIds';
import PerpsTPSLView from '../PerpsTPSLView/PerpsTPSLView';

let unwire: (() => void) | undefined;

const selectCross = async () => {
  jest
    .spyOn(Engine.context.PerpsController, 'getMarkets')
    .mockResolvedValue([
      { name: 'ETH', maxLeverage: 40, szDecimals: 2, marginTableId: 1 },
    ]);
  jest
    .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
    .mockResolvedValue('2000');
  const { store } = renderPerpsProMarketView({
    overrides: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsCrossMarginEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsTerminalBackendEnabled: {
                enabled: false,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    },
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
  await waitFor(() =>
    expect(Engine.context.PerpsController.getMarginModeLock).toHaveBeenCalled(),
  );
  fireEvent.press(await screen.findByTestId(formIds.MARGIN_MODE_BUTTON));
  await waitFor(() =>
    expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
  await waitFor(() =>
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    ),
  );
};

describe('Pro Cross margin risk editors', () => {
  afterEach(() => {
    cleanup();
    unwire?.();
    unwire = undefined;
    jest.restoreAllMocks();
    jest
      .mocked(Engine.context.PerpsController.calculateLiquidationPrice)
      .mockResolvedValue('0.00');
    jest.clearAllMocks();
  });

  it('opens leverage after selecting Cross without an isolated liquidation price or distance', async () => {
    await selectCross();

    fireEvent.press(screen.getByTestId(formIds.LEVERAGE_BUTTON));

    expect(
      await screen.findByTestId(leverageIds.LIQUIDATION_PRICE_VALUE),
    ).toHaveTextContent('--');
    expect(
      screen.queryByTestId(leverageIds.LIQUIDATION_DISTANCE_VALUE),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(`${leverageIds.PICKER_ITEM}-1`));
    expect(
      screen.getByTestId(leverageIds.LIQUIDATION_PRICE_VALUE),
    ).toHaveTextContent('--');
    expect(
      screen.queryByTestId(leverageIds.LIQUIDATION_DISTANCE_VALUE),
    ).not.toBeOnTheScreen();
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
