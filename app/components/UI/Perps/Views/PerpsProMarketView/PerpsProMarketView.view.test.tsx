import '../../../../../../tests/component-view/mocks';

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { renderPerpsProMarketView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../../../../tests/component-view/platform';
import {
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  PerpsBalanceBottomSheetSelectorsIDs,
  PerpsModeToggleSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
} from '../../Perps.testIds';

const ids = PerpsProOrderFormSelectorsIDs;
const TIMEOUT_MS = 5000;
const triggeredOrderTypeIDs = [
  PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
  PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
  PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
  PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
] as const;

const renderFundedProMarket = () =>
  renderPerpsProMarketView({
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
    },
  });

const renderProMarketWithTriggeredOrdersFlag = (enabled: boolean) =>
  renderPerpsProMarketView({
    streamOverrides: {
      account: createFundedAccountForViews('1000'),
    },
    overrides: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsProTriggeredOrdersEnabled: {
                enabled,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    },
  });

const findSizeInput = () =>
  screen.findByTestId(ids.SIZE_INPUT, {}, { timeout: TIMEOUT_MS });

describeForPlatforms('PerpsProMarketView input journeys', () => {
  afterEach(() => {
    cleanup();
  });

  itForPlatforms(
    'supports size backspace and retype, then removes limit-price leading zeros',
    async () => {
      renderFundedProMarket();
      const sizeInput = await findSizeInput();

      fireEvent(sizeInput, 'focus');
      fireEvent.changeText(sizeInput, '1');
      await waitFor(() => expect(sizeInput).toHaveProp('value', '1'));
      fireEvent.changeText(sizeInput, '');
      await waitFor(() => expect(sizeInput).toHaveProp('value', ''));
      fireEvent.changeText(sizeInput, '2');

      await waitFor(() => expect(sizeInput).toHaveProp('value', '2'));
      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );
      const limitPriceInput = await screen.findByTestId(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(limitPriceInput, '00025');

      await waitFor(() => expect(limitPriceInput).toHaveProp('value', '25'));
    },
  );

  itForPlatforms(
    'shows triggered order types when the remote flag is enabled',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));

      expect(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_SECTION_HEADER,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      for (const testID of triggeredOrderTypeIDs) {
        expect(screen.getByTestId(testID)).toBeOnTheScreen();
      }
    },
  );

  itForPlatforms(
    'hides triggered order types when the remote flag is disabled',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(false);
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
        {},
        { timeout: TIMEOUT_MS },
      );

      expect(
        screen.queryByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_SECTION_HEADER,
        ),
      ).not.toBeOnTheScreen();
      for (const testID of triggeredOrderTypeIDs) {
        expect(screen.queryByTestId(testID)).not.toBeOnTheScreen();
      }
    },
  );

  itForPlatforms(
    'keeps the size stable while toggling between USD and the asset',
    async () => {
      renderFundedProMarket();
      const sizeInput = await findSizeInput();
      const unitButton = screen.getByTestId(ids.SIZE_UNIT_BUTTON);

      fireEvent.changeText(sizeInput, '100');
      await waitFor(() => expect(sizeInput).toHaveProp('value', '100'));
      fireEvent.press(unitButton);

      await waitFor(() => {
        expect(sizeInput).toHaveProp('value', '0.04');
        expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
          'Size (ETH)',
        );
      });
      fireEvent.press(unitButton);

      await waitFor(() => {
        expect(sizeInput).toHaveProp('value', '100');
        expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
          'Size (USD)',
        );
      });
    },
  );

  itForPlatforms(
    'previews slider sizing live and keeps it after drag-end commit',
    async () => {
      renderFundedProMarket();
      const sizeInput = await findSizeInput();
      const slider = screen.getByTestId(ids.SIZE_SLIDER);
      const initialValue = sizeInput.props.value;

      fireEvent(slider, 'valueChange', 50);

      await waitFor(() => {
        expect(sizeInput.props.value).not.toBe(initialValue);
        expect(Number(sizeInput.props.value)).toBeGreaterThan(0);
      });
      const previewValue = sizeInput.props.value;
      fireEvent(slider, 'dragEnd', 50);

      await waitFor(() => expect(sizeInput).toHaveProp('value', previewValue));
    },
  );

  itForPlatforms(
    'blocks reduce-only orders when there is no open position',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('1000'),
          positions: [],
          orders: [],
        },
      });
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      await waitFor(() => {
        expect(
          screen.getByTestId(`${ids.NOTICE}-reduce-only`),
        ).toHaveTextContent(
          strings('perps.order.validation.reduce_only_no_position'),
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', '');
      });

      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'valueChange', 50);
      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'dragEnd', 50);

      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', ''),
      );
    },
  );

  itForPlatforms(
    'blocks reduce-only orders that match the open position direction',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('1000'),
          positions: [createLongPositionForViews()],
          orders: [],
        },
      });
      await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      await waitFor(() => {
        expect(
          screen.getByTestId(`${ids.NOTICE}-reduce-only`),
        ).toHaveTextContent(
          strings('perps.order.validation.reduce_only_wrong_side'),
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', '');
      });

      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'valueChange', 50);
      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'dragEnd', 50);

      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', ''),
      );
    },
  );

  itForPlatforms(
    'blocks reduce-only orders when size exceeds the open position',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('100000'),
          positions: [createLongPositionForViews({ size: '-1' })],
          orders: [],
        },
      });
      const sizeInput = await findSizeInput();

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));
      fireEvent.changeText(sizeInput, '3000');

      await waitFor(() => {
        expect(
          screen.getByTestId(`${ids.NOTICE}-reduce-only`),
        ).toHaveTextContent(
          strings('perps.order.validation.reduce_only_too_large'),
        );
        expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
        expect(sizeInput).toHaveProp('value', '3000');
      });
    },
  );

  itForPlatforms(
    'sets the size slider max to the open position when Reduce Only is selected',
    async () => {
      renderPerpsProMarketView({
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [createLongPositionForViews({ size: '-1' })],
          orders: [],
        },
      });
      await findSizeInput();
      const slider = screen.getByTestId(ids.SIZE_SLIDER);

      fireEvent(slider, 'valueChange', 2500);
      fireEvent(slider, 'dragEnd', 2500);

      await waitFor(() => {
        const marginCappedAmount = Number(
          screen.getByTestId(ids.SIZE_INPUT).props.value,
        );
        expect(marginCappedAmount).toBeGreaterThan(0);
        expect(marginCappedAmount).toBeLessThan(2500);
      });

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      await waitFor(() => {
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
      });

      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'valueChange', 2500);
      fireEvent(screen.getByTestId(ids.SIZE_SLIDER), 'dragEnd', 2500);

      await waitFor(() =>
        expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('value', '2500'),
      );
    },
  );

  itForPlatforms(
    'shows trigger price, hides TP/SL, and blocks Place order after an invalid stop-market blur',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      const triggerInput = await screen.findByTestId(ids.TRIGGER_PRICE_INPUT);
      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
      fireEvent.changeText(triggerInput, '1000');
      fireEvent(triggerInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.trigger_must_be_above_mid'),
          );
          expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'blocks a long take-market trigger above mid after blur',
    async () => {
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      const triggerInput = await screen.findByTestId(ids.TRIGGER_PRICE_INPUT);
      fireEvent.changeText(triggerInput, '3000');
      fireEvent(triggerInput, 'blur');

      await waitFor(
        () => {
          expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
            strings('perps.order.validation.trigger_must_be_below_mid'),
          );
          expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
    },
  );

  itForPlatforms(
    'submits a stop-limit order with triggerPrice and limit price',
    async () => {
      const placeOrder = Engine.context.PerpsController.placeOrder as jest.Mock;
      renderProMarketWithTriggeredOrdersFlag(true);
      const sizeInput = await findSizeInput();
      fireEvent.changeText(sizeInput, '100');

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
      fireEvent.press(
        await screen.findByTestId(
          PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      const triggerInput = await screen.findByTestId(ids.TRIGGER_PRICE_INPUT);
      const limitInput = await screen.findByTestId(ids.LIMIT_PRICE_INPUT);
      fireEvent.changeText(triggerInput, '2600');
      fireEvent(triggerInput, 'blur');
      fireEvent.changeText(limitInput, '2550');
      fireEvent(limitInput, 'blur');

      const placeOrderButton = screen.getByTestId(ids.PLACE_ORDER_BUTTON);
      await waitFor(
        () => {
          expect(placeOrderButton).not.toBeDisabled();
        },
        { timeout: TIMEOUT_MS },
      );
      fireEvent.press(placeOrderButton);

      await waitFor(
        () => {
          expect(placeOrder).toHaveBeenCalledWith(
            expect.objectContaining({
              symbol: 'ETH',
              orderType: 'stop_limit',
              triggerPrice: '2600',
              price: '2550',
            }),
          );
        },
        { timeout: TIMEOUT_MS },
      );
      expect(placeOrder.mock.calls[0][0]).not.toHaveProperty('takeProfitPrice');
    },
  );
});

describe('PerpsProMarketView header actions', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows Pro header actions including wallet, watchlist, and mode toggle', async () => {
    renderPerpsProMarketView();

    expect(
      await screen.findByTestId(
        PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    );

    expect(
      await screen.findByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
