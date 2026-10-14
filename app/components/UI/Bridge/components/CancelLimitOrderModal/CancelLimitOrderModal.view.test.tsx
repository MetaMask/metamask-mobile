import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  clearCancelLimitOrderApiMock,
  clearLimitOrdersDataServiceMock,
  setupCancelLimitOrderApiMock,
  setupLimitOrdersDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/limitOrders';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderBridgeViewWithModals,
  renderLimitOrderTabRow,
} from '../../../../../../tests/component-view/renderers/bridge';
import Engine from '../../../../../core/Engine';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import {
  LimitOrderState,
  type LimitOrder,
} from '../../api/limitOrders/getLimitOrders/types';
import { limitOrdersQueries } from '../../queries/limitOrders';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from '../OpenLimitOrderDetailsModal/testIds';
import { OpenOrderRowSelectorsIDs } from '../OpenOrderRow/OpenOrderRow.testIds';
import { OrdersTabsSelectorsIDs } from '../OrdersTabs/OrdersTabs.testIds';
import { CancelLimitOrderModalSelectorsIDs } from './testIds';

const { SHEET, ERROR_BANNER, CONFIRM_BUTTON } =
  CancelLimitOrderModalSelectorsIDs;
const DETAILS_SHEET = OpenLimitOrderDetailsModalSelectorsIDs.SHEET;
// A sheet covered by another one is hidden from accessibility, so it is only
// found when hidden elements are included.
const INCLUDE_HIDDEN = { includeHiddenElements: true };

/**
 * Opens the cancel sheet the way a user gets to it: from the order's row in
 * the orders list, through its details sheet.
 *
 * @param utils - The rendered screen showing the order's row.
 * @returns The render utils, plus a helper pressing the confirm button.
 */
const openCancelSheet = async <
  Utils extends ReturnType<typeof renderLimitOrderTabRow>,
>(
  utils: Utils,
) => {
  await act(async () => {
    fireEvent.press(
      await utils.findByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
    );
  });
  await act(async () => {
    fireEvent.press(
      await utils.findByTestId(
        OpenLimitOrderDetailsModalSelectorsIDs.CANCEL_ORDER_BUTTON,
      ),
    );
  });
  expect(await utils.findByTestId(SHEET)).toBeOnTheScreen();

  const pressConfirm = () =>
    act(async () => {
      fireEvent.press(utils.getByTestId(CONFIRM_BUTTON));
    });

  return { ...utils, pressConfirm };
};

const renderCancelSheet = () =>
  openCancelSheet(renderLimitOrderTabRow({ order: MOCK_LIMIT_OPEN_ORDER }));

describeForPlatforms('CancelLimitOrderModal', () => {
  afterEach(() => {
    clearCancelLimitOrderApiMock();
  });

  it('cancels the order and returns to the orders list', async () => {
    const scope = setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
    });
    const { getByTestId, queryByTestId, pressConfirm } =
      await renderCancelSheet();

    await pressConfirm();

    await waitFor(() =>
      expect(queryByTestId(SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen(),
    );
    // The details sheet described an order that is no longer open, so it
    // closes along with the cancel sheet.
    expect(queryByTestId(DETAILS_SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen();
    expect(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(scope.isDone()).toBe(true);
  });

  it('shows the confirm button as busy while the order is being cancelled', async () => {
    setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
      delayMs: 300,
    });
    const { getByTestId, queryByTestId, pressConfirm } =
      await renderCancelSheet();

    await pressConfirm();

    await waitFor(() => expect(getByTestId(CONFIRM_BUTTON)).toBeBusy());
    expect(getByTestId(CONFIRM_BUTTON)).toBeDisabled();
    await waitFor(() =>
      expect(queryByTestId(SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen(),
    );
  });

  it('shows an error banner and a try again button when the order could not be cancelled', async () => {
    const scope = setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
      status: 500,
      body: {},
    });
    const { findByTestId, getByTestId, pressConfirm } =
      await renderCancelSheet();

    await pressConfirm();

    expect(await findByTestId(ERROR_BANNER)).toHaveTextContent(
      strings('bridge.limit.error_canceling_order'),
    );
    expect(getByTestId(CONFIRM_BUTTON)).toHaveTextContent(
      strings('bridge.limit.try_again'),
    );
    expect(getByTestId(CONFIRM_BUTTON)).not.toBeDisabled();
    expect(getByTestId(SHEET)).toBeOnTheScreen();
    expect(getByTestId(DETAILS_SHEET, INCLUDE_HIDDEN)).toBeOnTheScreen();
    expect(scope.isDone()).toBe(true);
  });

  // The order filled, expired or started executing in the meantime. Trying
  // again cannot change that, so there is nothing left for the sheets to do.
  it('closes both sheets without an error when the order is no longer open', async () => {
    const scope = setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
      status: 409,
      body: {},
    });
    const { getByTestId, queryByTestId, pressConfirm } =
      await renderCancelSheet();

    await pressConfirm();

    await waitFor(() =>
      expect(queryByTestId(SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen(),
    );
    expect(queryByTestId(DETAILS_SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen();
    expect(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(scope.isDone()).toBe(true);
  });

  it('shows the error banner when the cancellation response is not a cancelled order', async () => {
    setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
      body: { order: { id: MOCK_LIMIT_OPEN_ORDER.id } },
    });
    const { findByTestId, getByTestId, pressConfirm } =
      await renderCancelSheet();

    await pressConfirm();

    expect(await findByTestId(ERROR_BANNER)).toBeOnTheScreen();
    expect(getByTestId(SHEET)).toBeOnTheScreen();
  });

  it('cancels the order when trying again after a failed attempt', async () => {
    const failedScope = setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
      status: 503,
      body: {},
    });
    const { findByTestId, getByTestId, queryByTestId, pressConfirm } =
      await renderCancelSheet();

    await pressConfirm();
    expect(await findByTestId(ERROR_BANNER)).toBeOnTheScreen();
    expect(failedScope.isDone()).toBe(true);

    const retryScope = setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
    });
    await pressConfirm();

    await waitFor(() =>
      expect(queryByTestId(SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen(),
    );
    expect(queryByTestId(DETAILS_SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen();
    expect(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(retryScope.isDone()).toBe(true);
  });

  it('does not cancel the order when the sheet is dismissed', async () => {
    const scope = setupCancelLimitOrderApiMock({
      order: MOCK_LIMIT_OPEN_ORDER,
    });
    const { findByTestId, queryByTestId } = await renderCancelSheet();

    await act(async () => {
      fireEvent.press(
        await findByTestId(CancelLimitOrderModalSelectorsIDs.CLOSE_BUTTON),
      );
    });

    expect(queryByTestId(SHEET)).not.toBeOnTheScreen();
    expect(await findByTestId(DETAILS_SHEET)).toBeOnTheScreen();
    expect(scope.isDone()).toBe(false);
  });
});

describeForPlatforms('CancelLimitOrderModal — orders tabs', () => {
  const closeOrder = (state: LimitOrderState): LimitOrder => ({
    ...MOCK_LIMIT_OPEN_ORDER,
    state,
    isCancellable: false,
    timingData: {
      ...MOCK_LIMIT_OPEN_ORDER.timingData,
      closedAt: '2026-09-21T12:00:00.000Z',
    },
  });

  // The order as the API currently has it. Every orders request is answered
  // from it, so each tab only lists it while its state belongs there.
  let currentOrder: LimitOrder;

  beforeEach(() => {
    currentOrder = MOCK_LIMIT_OPEN_ORDER;
    setupLimitOrdersDataServiceMock({
      limitOrders: async ({ states }) => {
        // Answering the refetch after the cancellation takes a while, so the
        // sheets closing before the lists are refreshed would show.
        if (currentOrder !== MOCK_LIMIT_OPEN_ORDER) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        return {
          orders: states?.some((state) => state === currentOrder.state)
            ? [currentOrder]
            : [],
        };
      },
    });
  });

  afterEach(() => {
    clearCancelLimitOrderApiMock();
    clearLimitOrdersDataServiceMock();
  });

  const renderOrdersTab = async () => {
    const utils = renderBridgeViewWithModals();

    await act(async () => {
      fireEvent.press(utils.getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));
    });

    return utils;
  };

  it.each([
    {
      outcome: 'cancelled',
      status: 200,
      closedOrder: closeOrder(LimitOrderState.Cancelled),
      historyStatus: strings('bridge.limit.canceled'),
    },
    {
      outcome: 'already filled',
      status: 409,
      closedOrder: closeOrder(LimitOrderState.Filled),
      historyStatus: strings('bridge.limit.filled'),
    },
  ])(
    'moves an order that is $outcome from the open orders to the history once the sheets close',
    async ({ status, closedOrder, historyStatus }) => {
      setupCancelLimitOrderApiMock({
        order: MOCK_LIMIT_OPEN_ORDER,
        status,
        body: status === 200 ? undefined : {},
        onRequest: () => {
          currentOrder = closedOrder;
        },
      });
      const { findByTestId, getByTestId, queryByTestId, pressConfirm } =
        await openCancelSheet(await renderOrdersTab());

      await pressConfirm();

      await waitFor(() =>
        expect(queryByTestId(SHEET, INCLUDE_HIDDEN)).not.toBeOnTheScreen(),
      );
      // Refreshed before the sheets closed, not after: the order is already
      // gone from the open orders.
      expect(
        queryByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(getByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeOnTheScreen();
      // The data service's own cache is refreshed too, or it would keep
      // serving both lists as they were.
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'LimitOrdersDataService:invalidateQueries',
        { queryKey: limitOrdersQueries.allOrdersKey() },
        undefined,
      );

      await act(async () => {
        fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));
      });

      const historyRow = await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER);
      expect(within(historyRow).getByText(historyStatus)).toBeOnTheScreen();
    },
  );
});
