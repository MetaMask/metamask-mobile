import { useEffect, useState } from 'react';
import type { OrderItem, OrderDomain } from './types';
import { MOCK_ORDERS } from './mockOrders';

class OrdersStore {
  private orders: OrderItem[] = [...MOCK_ORDERS];
  private listeners: Set<() => void> = new Set();

  getOrders(): OrderItem[] {
    return [...this.orders];
  }

  getOrdersForToken(tokenSymbol?: string): OrderItem[] {
    if (!tokenSymbol) {
      return this.getOrders();
    }
    const upper = tokenSymbol.toUpperCase();
    return this.orders.filter(
      (order) =>
        order.instrument.baseAssetSymbol.toUpperCase() === upper ||
        order.instrument.symbol.toUpperCase().includes(upper),
    );
  }

  getOrdersByDomain(domain?: string): OrderItem[] {
    if (!domain || domain === 'all') {
      return this.getOrders();
    }
    return this.orders.filter((order) => order.domain === domain);
  }

  addOrder(order: OrderItem): OrderItem {
    this.orders = [order, ...this.orders];
    this.notify();
    return order;
  }

  cancelOrder(orderId: string): void {
    this.orders = this.orders.filter((o) => o.id !== orderId);
    this.notify();
  }

  /**
   * Helper to create a new sample Ethereum Limit Order for PoC demonstrations.
   */
  createSampleEthLimitOrder(params?: {
    size?: string;
    price?: string;
    side?: 'buy' | 'sell';
  }): OrderItem {
    const side = params?.side ?? 'buy';
    const size = params?.size ?? '2.0';
    const price = params?.price ?? '2350.00';
    const notional = (parseFloat(size) * parseFloat(price)).toLocaleString(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
      },
    );

    const newOrder: OrderItem = {
      id: `eth-limit-${Date.now()}`,
      domain: 'swap',
      orderType: 'limit',
      status: 'open',
      side,
      instrument: {
        symbol: 'ETH/USDC',
        name: 'Ethereum',
        baseAssetSymbol: 'ETH',
        quoteAssetSymbol: 'USDC',
        chainId: '1',
        networkName: 'Ethereum Mainnet',
      },
      size,
      formattedSize: `${size} ETH`,
      price,
      formattedPrice: `$${parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })}`,
      notionalValueUsd: notional,
      timestamp: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
      canCancel: true,
      cancelType: 'offChain',
      canEdit: true,
      metadata: {
        routingSource: 'Uniswap V3',
        slippageTolerance: '0.5%',
        note: 'Sample Limit Order (PoC)',
      },
    };

    return this.addOrder(newOrder);
  }

  reset(): void {
    this.orders = [...MOCK_ORDERS];
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const ordersStore = new OrdersStore();

/**
 * React hook to reactively subscribe to orders across the 3 surfaces.
 */
export function useOrdersStore(filter?: {
  tokenSymbol?: string;
  domain?: OrderDomain | 'all';
}) {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    if (filter?.tokenSymbol) {
      return ordersStore.getOrdersForToken(filter.tokenSymbol);
    }
    if (filter?.domain) {
      return ordersStore.getOrdersByDomain(filter.domain);
    }
    return ordersStore.getOrders();
  });

  useEffect(() => {
    const update = () => {
      if (filter?.tokenSymbol) {
        setOrders(ordersStore.getOrdersForToken(filter.tokenSymbol));
      } else if (filter?.domain) {
        setOrders(ordersStore.getOrdersByDomain(filter.domain));
      } else {
        setOrders(ordersStore.getOrders());
      }
    };

    return ordersStore.subscribe(update);
  }, [filter?.tokenSymbol, filter?.domain]);

  return {
    orders,
    createSampleEthLimitOrder: (params?: {
      size?: string;
      price?: string;
      side?: 'buy' | 'sell';
    }) => ordersStore.createSampleEthLimitOrder(params),
    cancelOrder: (orderId: string) => ordersStore.cancelOrder(orderId),
  };
}
