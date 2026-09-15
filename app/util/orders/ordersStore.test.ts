import { ordersStore } from './ordersStore';

describe('ordersStore', () => {
  beforeEach(() => {
    ordersStore.reset();
  });

  it('creates a sample ETH limit order and adds it to the store', () => {
    const initialCount = ordersStore.getOrders().length;

    const newOrder = ordersStore.createSampleEthLimitOrder({
      side: 'buy',
      size: '3.5',
      price: '2200.00',
    });

    expect(newOrder.instrument.baseAssetSymbol).toBe('ETH');
    expect(newOrder.formattedSize).toBe('3.5 ETH');
    expect(newOrder.formattedPrice).toBe('$2,200.00');
    expect(ordersStore.getOrders().length).toBe(initialCount + 1);
  });

  it('filters orders by token symbol', () => {
    const ethOrders = ordersStore.getOrdersForToken('ETH');
    expect(ethOrders.length).toBeGreaterThan(0);
    expect(ethOrders.every((o) => o.instrument.baseAssetSymbol === 'ETH')).toBe(
      true,
    );
  });

  it('filters orders by domain', () => {
    const perpsOrders = ordersStore.getOrdersByDomain('perps');
    expect(perpsOrders.length).toBeGreaterThan(0);
    expect(perpsOrders.every((o) => o.domain === 'perps')).toBe(true);
  });

  it('cancels an order by ID', () => {
    const newOrder = ordersStore.createSampleEthLimitOrder();
    expect(ordersStore.getOrders().some((o) => o.id === newOrder.id)).toBe(
      true,
    );

    ordersStore.cancelOrder(newOrder.id);
    expect(ordersStore.getOrders().some((o) => o.id === newOrder.id)).toBe(
      false,
    );
  });
});
