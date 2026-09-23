import '../../../../../../tests/component-view/mocks';
import { act, fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderLimitOrderTabRow } from '../../../../../../tests/component-view/renderers/bridge';
import {
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import { OpenOrderRowSelectorsIDs } from '../OpenOrderRow/OpenOrderRow.testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from '../OpenLimitOrderDetailsModal/testIds';

describeForPlatforms('LimitOrderTabRow — opening the details sheet', () => {
  it('opens the order details sheet when an open order is pressed', async () => {
    const { findByTestId } = renderLimitOrderTabRow({
      order: MOCK_LIMIT_OPEN_ORDER,
    });

    await act(async () => {
      fireEvent.press(await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER));
    });

    expect(
      await findByTestId(OpenLimitOrderDetailsModalSelectorsIDs.SHEET),
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
