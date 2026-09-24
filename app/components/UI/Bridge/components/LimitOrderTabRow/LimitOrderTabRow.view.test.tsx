import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderLimitOrderTabRow } from '../../../../../../tests/component-view/renderers/bridge';
import {
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import { OpenOrderRowSelectorsIDs } from '../OpenOrderRow/OpenOrderRow.testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from '../OpenLimitOrderDetailsModal/testIds';

describeForPlatforms('LimitOrderTabRow — opening the details sheet', () => {
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
          amount: MOCK_LIMIT_OPEN_ORDER.limitPrice,
          symbol: MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
        }),
      ),
    ).toBeOnTheScreen();
  });

  // The details sheet only offers cancellation, which no longer applies once
  // the order has left the open state.
  it('does not open the order details sheet for a filled order', async () => {
    const { findByTestId, queryByTestId } = renderLimitOrderTabRow({
      order: MOCK_LIMIT_FILLED_ORDER,
    });

    await act(async () => {
      fireEvent.press(await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER));
    });

    expect(
      queryByTestId(OpenLimitOrderDetailsModalSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
  });
});
