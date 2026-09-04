import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { renderBridgeView } from '../../../../../../../tests/component-view/renderers/bridge';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { OrdersTabsSelectorsIDs } from '../../../components/OrdersTabs';
import { BuildQuoteSelectors } from '../../../../Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';

async function openLimitTab(renderResult: ReturnType<typeof renderBridgeView>) {
  fireEvent.press(renderResult.getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
    ).toBeOnTheScreen();
  });
}

async function openAmountKeypad(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent(
    renderResult.getByTestId(BridgeViewSelectorsIDs.LIMIT_SOURCE_TOKEN_INPUT),
    'pressIn',
  );

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
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

  it('keeps the dest amount input and does not show Recurring You get copy', async () => {
    const renderResult = renderBridgeView();

    await openLimitTab(renderResult);

    expect(
      renderResult.getByTestId(BridgeViewSelectorsIDs.LIMIT_DEST_TOKEN_INPUT),
    ).toBeOnTheScreen();
    expect(
      renderResult.queryByText(strings('bridge.recurring.you_get')),
    ).not.toBeOnTheScreen();
  });

  it('hides the footer confirm button after opening the tab without a quote', async () => {
    const renderResult = renderBridgeView();

    await openLimitTab(renderResult);

    expect(
      renderResult.queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens the keypad with amount quick picks when the source amount is pressed', async () => {
    const renderResult = renderBridgeView();

    await openLimitTab(renderResult);
    await openAmountKeypad(renderResult);

    expect(renderResult.getByText('25%')).toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD),
    ).not.toBeOnTheScreen();
  });

  it('replaces amount quick picks with the keypad confirm button after a source amount is entered', async () => {
    const renderResult = renderBridgeView();

    await openLimitTab(renderResult);
    await openAmountKeypad(renderResult);

    fireEvent.press(renderResult.getByTestId('keypad-key-2'));

    await waitFor(() => {
      expect(
        renderResult.getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD),
      ).toBeOnTheScreen();
    });
    expect(renderResult.queryByText('25%')).not.toBeOnTheScreen();
  });
});
