/**
 * Mock response data for buy (aggregator) checkout flow.
 * Endpoints: GET buy widget URL, GET callback.
 * After a quote is selected, RampsController.syncWidgetUrl() fetches the widget URL,
 * then getOrderFromCallback() extracts the order ID from the provider callback.
 */

export const BUY_ORDER_WIDGET_URL_RESPONSE = {
  url: 'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback?orderId=mock-order-123',
  browser: 'APP_BROWSER',
  orderId: null,
};

export const BUY_ORDER_CALLBACK_RESPONSE = {
  id: 'mock-order-123',
};
