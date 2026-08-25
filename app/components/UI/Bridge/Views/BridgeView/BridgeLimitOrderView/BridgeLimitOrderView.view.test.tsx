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
  it('shows filled and expired history rows after pressing the History tab', async () => {
    const renderResult = renderBridgeView();

    await openLimitTab(renderResult);

    const pair = strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' });

    expect(renderResult.getAllByText(pair)).toHaveLength(4);
    expect(
      renderResult.getByText(strings('bridge.all_networks')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(strings('bridge.limit.not_enough_gas')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(
        strings('bridge.limit.expiry', { timeLeft: '4d left' }),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      renderResult.getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByText(strings('bridge.limit.not_enough_gas')),
      ).toBeNull();
    });
    expect(
      renderResult.queryByText(
        strings('bridge.limit.expiry', { timeLeft: '4d left' }),
      ),
    ).toBeNull();
    expect(
      renderResult.queryByText(strings('bridge.orders.empty.history')),
    ).toBeNull();
    expect(
      renderResult.getByText(strings('bridge.all_networks')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(strings('bridge.limit.filled')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(strings('bridge.limit.expired')),
    ).toBeOnTheScreen();
    expect(renderResult.getByText('+0.325 USDC')).toBeOnTheScreen();
    expect(
      renderResult.getByText(
        strings('bridge.limit.limit_price', { symbol: 'USDC' }),
      ),
    ).toBeOnTheScreen();
    expect(renderResult.getAllByText(pair)).toHaveLength(2);
  });
});
