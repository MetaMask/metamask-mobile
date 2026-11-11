import '../../../../../../tests/component-view/mocks';

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { renderPerpsCrossMarginOrderFormPanel } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { createLongPositionForViews } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  openMarginModeSheet,
  resetMarginModeControllerMocks,
} from '../../../../../../tests/component-view/helpers/perpsMarginModeTestHelpers';
import { strings } from '../../../../../../locales/i18n';
import {
  getPerpsLeveragePickerItemTestId,
  PerpsLeverageBottomSheetSelectorsIDs as leverageIds,
  PerpsMarginModeBottomSheetSelectorsIDs as marginIds,
  PerpsProOrderFormSelectorsIDs as formIds,
} from '../../Perps.testIds';

describeForPlatforms('PerpsLeverageBottomSheet Cross margin', () => {
  beforeEach(resetMarginModeControllerMocks);
  afterEach(cleanup);

  it('discards the isolated estimate after selecting Cross and reopening leverage', async () => {
    renderPerpsCrossMarginOrderFormPanel();
    await screen.findByTestId(formIds.LEVERAGE_BUTTON);
    fireEvent.press(screen.getByTestId(formIds.LEVERAGE_BUTTON));
    await waitFor(
      () =>
        expect(
          screen.getByTestId(leverageIds.LIQUIDATION_PRICE_VALUE),
        ).not.toHaveTextContent('--'),
      { timeout: 5000 },
    );
    expect(
      screen.getByTestId(leverageIds.LIQUIDATION_DISTANCE_VALUE),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(leverageIds.SET_BUTTON));
    await waitFor(() =>
      expect(screen.queryByTestId(leverageIds.PICKER)).not.toBeOnTheScreen(),
    );
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(formIds.LEVERAGE_BUTTON));
    fireEvent.press(
      await screen.findByTestId(getPerpsLeveragePickerItemTestId(1)),
    );

    expect(
      screen.getByTestId(leverageIds.LIQUIDATION_PRICE_VALUE),
    ).toHaveTextContent('--');
    expect(
      screen.queryByTestId(leverageIds.LIQUIDATION_DISTANCE_VALUE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(leverageIds.LIQUIDATION_TREND_ICON),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(leverageIds.SET_BUTTON));
    await waitFor(() =>
      expect(screen.getByTestId(formIds.LEVERAGE_BUTTON)).toHaveTextContent(
        '1x',
      ),
    );
  });

  it('keeps an open Cross position margin mode locked while changing leverage', async () => {
    renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: {
        positions: [
          createLongPositionForViews({ leverage: { type: 'cross', value: 5 } }),
        ],
      },
    });
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.ISOLATED_OPTION)).toBeDisabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(formIds.LEVERAGE_BUTTON));
    fireEvent.press(
      await screen.findByTestId(getPerpsLeveragePickerItemTestId(10)),
    );
    expect(
      screen.getByTestId(leverageIds.LIQUIDATION_PRICE_VALUE),
    ).toHaveTextContent('--');
    fireEvent.press(screen.getByTestId(leverageIds.SET_BUTTON));

    await waitFor(() =>
      expect(screen.getByTestId(formIds.LEVERAGE_BUTTON)).toHaveTextContent(
        '10x',
      ),
    );
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.ISOLATED_OPTION)).toBeDisabled(),
    );
  });
});
