import '../../../../../../tests/component-view/mocks';

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { renderPerpsCrossMarginOrderFormPanel } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { createLongPositionForViews } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  openMarginModeSheet,
  resetMarginModeControllerMocks,
} from '../../../../../../tests/component-view/helpers/perpsMarginModeTestHelpers';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  PerpsMarginModeBottomSheetSelectorsIDs as marginIds,
  PerpsProOrderFormSelectorsIDs as formIds,
} from '../../Perps.testIds';

describeForPlatforms('PerpsMarginModeBottomSheet position locks', () => {
  beforeEach(resetMarginModeControllerMocks);
  afterEach(cleanup);

  it.each(['cross', 'isolated'] as const)(
    'keeps the %s position mode when the opposite option is pressed',
    async (marginMode) => {
      renderPerpsCrossMarginOrderFormPanel({
        streamOverrides: {
          positions: [
            createLongPositionForViews({
              leverage: { type: marginMode, value: 5 },
            }),
          ],
        },
      });

      await openMarginModeSheet();
      const selectedId =
        marginMode === 'cross'
          ? marginIds.CROSS_OPTION
          : marginIds.ISOLATED_OPTION;
      const disabledId =
        marginMode === 'cross'
          ? marginIds.ISOLATED_OPTION
          : marginIds.CROSS_OPTION;
      await waitFor(() =>
        expect(screen.getByTestId(disabledId)).toBeDisabled(),
      );
      fireEvent.press(screen.getByTestId(disabledId));

      expect(screen.getByTestId(marginIds.CONTAINER)).toBeOnTheScreen();
      expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
        strings(`perps.margin_mode.${marginMode}_title`),
      );
      expect(screen.getByTestId(selectedId)).toBeEnabled();
      const sheet = within(screen.getByTestId(marginIds.CONTAINER));
      expect(
        sheet.getByText(strings('perps.margin_mode.title')),
      ).toBeOnTheScreen();
      expect(
        sheet.getByText(strings('perps.margin_mode.isolated_description')),
      ).toBeOnTheScreen();
      expect(
        sheet.getByText(
          strings('perps.margin_mode.cross_description_available'),
        ),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(selectedId));
      await waitFor(() =>
        expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
      );
    },
  );

  it('allows switching to Cross after the isolated position closes', async () => {
    const { stream } = renderPerpsCrossMarginOrderFormPanel({
      streamOverrides: { positions: [createLongPositionForViews()] },
    });
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeDisabled(),
    );

    act(() => stream.emitPositions([]));
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CROSS_OPTION));

    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(formIds.MARGIN_MODE_BUTTON)).toHaveTextContent(
      strings('perps.margin_mode.cross_title'),
    );
  });

  it('refreshes and respects a resting-order lock when opening the picker', async () => {
    renderPerpsCrossMarginOrderFormPanel();
    await openMarginModeSheet();
    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(marginIds.CLOSE_BUTTON));
    await waitFor(() =>
      expect(screen.queryByTestId(marginIds.CONTAINER)).not.toBeOnTheScreen(),
    );
    jest
      .mocked(Engine.context.PerpsController.getMarginModeLock)
      .mockResolvedValue({
        status: 'locked',
        providerId: 'hyperliquid',
        marginMode: 'isolated',
        reason: 'open_order',
      });

    await openMarginModeSheet();

    await waitFor(() =>
      expect(screen.getByTestId(marginIds.CROSS_OPTION)).toBeDisabled(),
    );
    expect(
      Engine.context.PerpsController.getMarginModeLock,
    ).toHaveBeenCalledWith({ symbol: 'ETH', providerId: 'hyperliquid' });
  });
});
