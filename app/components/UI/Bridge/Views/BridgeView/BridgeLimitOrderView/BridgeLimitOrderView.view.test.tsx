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

    expect(
      renderResult.getByText(
        strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' }),
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
    expect(
      renderResult.queryByText(
        strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' }),
      ),
    ).toBeNull();
  });
});
