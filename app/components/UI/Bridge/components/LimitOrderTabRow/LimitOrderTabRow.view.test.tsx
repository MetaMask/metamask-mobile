import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderLimitOrderTabRow } from '../../../../../../tests/component-view/renderers/bridge';
import {
  clearGetLimitOrderApiMock,
  setupGetLimitOrderApiMock,
} from '../../../../../../tests/component-view/api-mocking/limitOrders';
import {
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import { LimitOrderState } from '../../api/limitOrders/getLimitOrders/types';
import { SwapsLimitOrderActivityPageSelectorsIDs } from '../../Views/SwapsLimitOrderActivityPage/SwapsLimitOrderActivityPage.testIds';
import { OpenOrderRowSelectorsIDs } from '../OpenOrderRow/OpenOrderRow.testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from '../OpenLimitOrderDetailsModal/testIds';

describeForPlatforms('LimitOrderTabRow — opening the details sheet', () => {
  afterEach(() => {
    clearGetLimitOrderApiMock();
  });

  it('opens the details sheet of the order that was pressed', async () => {
    const { findByTestId } = renderLimitOrderTabRow({
      order: MOCK_LIMIT_OPEN_ORDER,
    });

    await act(async () => {
      fireEvent.press(await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER));
    });

    const sheet = await findByTestId(
      OpenLimitOrderDetailsModalSelectorsIDs.SHEET,
    );
    expect(sheet).toBeOnTheScreen();

    // The pressed order is ETH → USDC at 2200 USDC per ETH, so the sheet has
    // to show that pair rather than any order of its own.
    expect(
      within(sheet).getByText(
        strings('bridge.limit.pair', {
          source: MOCK_LIMIT_OPEN_ORDER.src.asset.symbol,
          dest: MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(
        within(sheet).getByTestId(
          OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_CONDITION,
        ),
      ).getByText(
        strings('bridge.limit.quote_unit', {
          amount: MOCK_LIMIT_OPEN_ORDER.trigger.price,
          symbol: MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
        }),
      ),
    ).toBeOnTheScreen();
  });

  // The details sheet only offers cancellation, which no longer applies once
  // the order has left the open state, so a closed order opens its activity
  // page instead.
  it('opens the activity page rather than the details sheet for a filled order', async () => {
    setupGetLimitOrderApiMock({ order: MOCK_LIMIT_FILLED_ORDER });
    const { findByTestId, queryByTestId } = renderLimitOrderTabRow({
      order: MOCK_LIMIT_FILLED_ORDER,
    });

    await act(async () => {
      fireEvent.press(await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER));
    });

    expect(
      await findByTestId(SwapsLimitOrderActivityPageSelectorsIDs.SCREEN),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(OpenLimitOrderDetailsModalSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
  });

  // The open orders tab also lists orders the API has started executing, which
  // can no longer be cancelled but are still worth looking at.
  it.each([LimitOrderState.Executing, LimitOrderState.Submitted])(
    'opens the details sheet without the cancel button for a %s order',
    async (state) => {
      const { findByTestId, queryByTestId } = renderLimitOrderTabRow({
        order: { ...MOCK_LIMIT_OPEN_ORDER, state, isCancellable: false },
      });

      await act(async () => {
        fireEvent.press(await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER));
      });

      expect(
        await findByTestId(OpenLimitOrderDetailsModalSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(
          OpenLimitOrderDetailsModalSelectorsIDs.CANCEL_ORDER_BUTTON,
        ),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(SwapsLimitOrderActivityPageSelectorsIDs.SCREEN),
      ).not.toBeOnTheScreen();
    },
  );
});
