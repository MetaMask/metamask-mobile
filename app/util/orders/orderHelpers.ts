import type { OrderItem, OrderDetailRow } from './types';

export function formatOrderTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDomainName(domain: OrderItem['domain']): string {
  switch (domain) {
    case 'swap':
      return 'Swaps Limit';
    case 'perps':
      return 'Perpetuals';
    case 'predict':
      return 'Predict Market';
    default:
      return domain;
  }
}

export function getStatusBadgeVariant(
  status: OrderItem['status'],
): 'default' | 'error' | 'warning' | 'success' {
  switch (status) {
    case 'open':
      return 'default';
    case 'partiallyFilled':
      return 'warning';
    case 'filled':
      return 'success';
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'error';
    default:
      return 'default';
  }
}

export function resolveOrderDetailRows(order: OrderItem): OrderDetailRow[] {
  const rows: OrderDetailRow[] = [
    {
      key: 'created',
      label: 'Created',
      value: formatOrderTimestamp(order.timestamp),
    },
    {
      key: 'domain',
      label: 'Trade Type',
      value: formatDomainName(order.domain),
    },
    {
      key: 'side',
      label: 'Side',
      value: order.side.toUpperCase(),
      variant:
        order.side === 'buy' || order.side === 'long' || order.side === 'yes'
          ? 'success'
          : 'error',
    },
    ...(order.formattedPrice
      ? [
          {
            key: 'price',
            label: 'Limit / Target Price',
            value: order.formattedPrice,
          },
        ]
      : []),
    ...(order.formattedTriggerPrice
      ? [
          {
            key: 'triggerPrice',
            label: 'Trigger Price',
            value: order.formattedTriggerPrice,
          },
        ]
      : []),
    {
      key: 'size',
      label: 'Order Size',
      value: order.formattedSize,
    },
    ...(order.filledSize
      ? [
          {
            key: 'filledSize',
            label: 'Filled Size',
            value: `${order.filledSize} (${order.fillPercentage ?? 0}%)`,
          },
        ]
      : []),
    ...(order.notionalValueUsd
      ? [
          {
            key: 'notional',
            label: 'Est. Order Value',
            value: order.notionalValueUsd,
          },
        ]
      : []),
    ...(order.instrument.networkName
      ? [
          {
            key: 'network',
            label: 'Network',
            value: order.instrument.networkName,
          },
        ]
      : []),
  ];

  // Domain-specific rows
  if (order.domain === 'perps' && order.metadata) {
    if (order.metadata.leverage) {
      rows.push({
        key: 'leverage',
        label: 'Leverage',
        value: String(order.metadata.leverage),
      });
    }
    if (order.metadata.marginMode) {
      rows.push({
        key: 'marginMode',
        label: 'Margin Mode',
        value: String(order.metadata.marginMode),
      });
    }
    if (order.metadata.estLiquidationPrice) {
      rows.push({
        key: 'liqPrice',
        label: 'Est. Liquidation',
        value: String(order.metadata.estLiquidationPrice),
        variant: 'warning',
      });
    }
  }

  if (order.domain === 'predict' && order.metadata) {
    if (order.metadata.potentialPayout) {
      rows.push({
        key: 'payout',
        label: 'Potential Payout',
        value: String(order.metadata.potentialPayout),
        variant: 'success',
      });
    }
    if (order.metadata.marketResolutionDate) {
      rows.push({
        key: 'resolution',
        label: 'Resolution Date',
        value: String(order.metadata.marketResolutionDate),
      });
    }
  }

  if (order.domain === 'swap' && order.metadata) {
    if (order.metadata.routingSource) {
      rows.push({
        key: 'routing',
        label: 'Routing Aggregator',
        value: String(order.metadata.routingSource),
      });
    }
  }

  return rows;
}
