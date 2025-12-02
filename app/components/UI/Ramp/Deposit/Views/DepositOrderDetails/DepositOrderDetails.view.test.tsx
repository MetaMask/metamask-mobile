import '../../../../../../util/test/component-view/mocks';
import { describeForPlatforms } from '../../../../../../util/test/platform';
import { renderDepositOrderDetailsView } from '../../../../../../util/test/component-view/renderers/deposit';
import { strings } from '../../../../../../../locales/i18n';

describeForPlatforms('DepositOrderDetails component-view', () => {
  it('renders order details with amounts, network, account and ids', () => {
    const { getByText } = renderDepositOrderDetailsView({
      deterministicFiat: true,
    });

    // Amount and crypto
    expect(getByText('0.05 USDC')).toBeTruthy();

    // Labels
    expect(getByText(strings('deposit.order_processing.account'))).toBeTruthy();
    expect(getByText(strings('deposit.order_processing.network'))).toBeTruthy();
    expect(
      getByText(strings('deposit.order_processing.order_id')),
    ).toBeTruthy();
    expect(getByText(strings('deposit.order_processing.fees'))).toBeTruthy();
    expect(getByText(strings('deposit.order_processing.total'))).toBeTruthy();

    // Network name (from default preset order data)
    expect(getByText('Ethereum Main Network')).toBeTruthy();

    // Short order id from providerOrderId last 6
    expect(getByText('..123456')).toBeTruthy();

    // Fiat values (deterministic locale)
    expect(getByText('$2.50')).toBeTruthy();
    expect(getByText('$100.00')).toBeTruthy();
  });

  it('uses order.id tail when providerOrderId is missing', () => {
    const orderId = 'order-XYZ789';
    const { getByText } = renderDepositOrderDetailsView({
      deterministicFiat: true,
      orderId,
      orderOverrides: {
        id: orderId,
        data: {
          // remove providerOrderId so component falls back to order.id
          providerOrderId: undefined,
        } as unknown as import('@consensys/native-ramps-sdk').DepositOrder,
      },
    });

    expect(getByText('..XYZ789')).toBeTruthy();
  });
});
