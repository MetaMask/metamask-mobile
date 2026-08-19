import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { renderBridgeView } from '../../../../../../../tests/component-view/renderers/bridge';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { OrdersTabsSelectorsIDs } from '../../../components/OrdersTabs';

async function openLimitTab(renderResult: ReturnType<typeof renderBridgeView>) {
  fireEvent.press(renderResult.getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
    ).toBeOnTheScreen();
  });
}

describeForPlatforms('BridgeLimitOrderView', () => {
  it('shows history empty copy after pressing the History tab', async () => {
    const renderResult = renderBridgeView();

    await openLimitTab(renderResult);

    const pair = strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' });

    expect(renderResult.getAllByText(pair)).toHaveLength(4);
    expect(
      renderResult.getByText(strings('bridge.limit.not_enough_gas')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(
        strings('bridge.limit.filled_at', { date: 'Mar 12' }),
      ),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(
        strings('bridge.limit.expired_after', { duration: 'X' }),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      renderResult.getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB),
    );

    await waitFor(() => {
      expect(
        renderResult.getByText(strings('bridge.orders.empty.history')),
      ).toBeOnTheScreen();
    });
    expect(renderResult.queryAllByText(pair)).toHaveLength(0);
  });
});
