import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  isCaipChainId,
  parseCaipChainId,
  toCaipChainId,
  type CaipChainId,
} from '@metamask/utils';
import { getDecimalChainId } from '../../../util/networks';
import type { Status, TokenAmount } from '../types';
import {
  toRampOrderCaipChainId,
  type RampActivityKind,
} from './ramp-order-helpers';

/**
 * Maps a RampsController order type string to an activity kind.
 * DEPOSIT is treated as buy at the activity layer (mirrors legacy Deposit).
 */
export function mapRampsOrderType(
  orderType: string | null | undefined,
): RampActivityKind | null {
  switch (orderType) {
    case 'BUY':
    case 'DEPOSIT':
      return 'buy';
    case 'SELL':
      return 'sell';
    default:
      return null;
  }
}

export function mapRampsOrderStatus(status: RampsOrderStatus): Status {
  switch (status) {
    case RampsOrderStatus.Completed:
      return 'success';
    case RampsOrderStatus.Failed:
    case RampsOrderStatus.IdExpired:
      return 'failed';
    case RampsOrderStatus.Cancelled:
      return 'cancelled';
    case RampsOrderStatus.Pending:
    case RampsOrderStatus.Created:
    case RampsOrderStatus.Precreated:
    case RampsOrderStatus.Unknown:
    default:
      return 'pending';
  }
}

function toEpochMs(value: unknown): number {
  if (typeof value === 'number' && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) {
      return ms;
    }
  }
  return 0;
}

export function getRampsOrderCreatedAt(order: RampsOrder): number {
  return toEpochMs(order.createdAt);
}

/**
 * Resolves CAIP-2 chain id from `network` (object or decimal/CAIP string) or
 * `cryptoCurrency.chainId`.
 */
export function toRampsOrderCaipChainId(order: RampsOrder): CaipChainId | null {
  const network = order.network as RampsOrder['network'] | string | null;
  if (network && typeof network === 'object' && network.chainId) {
    return toRampOrderCaipChainId(network.chainId);
  }
  if (typeof network === 'string' && network) {
    return toRampOrderCaipChainId(network);
  }

  const cryptoChainId = order.cryptoCurrency?.chainId;
  if (cryptoChainId) {
    try {
      if (isCaipChainId(cryptoChainId)) {
        const { namespace, reference } = parseCaipChainId(cryptoChainId);
        return toCaipChainId(namespace, reference);
      }
      const chainReference = getDecimalChainId(cryptoChainId);
      if (chainReference && !Number.isNaN(Number(chainReference))) {
        return toCaipChainId('eip155', chainReference);
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function getRampsOrderTransactionHash(
  order: RampsOrder,
): string | undefined {
  return order.txHash || undefined;
}

export function toRampsOrderToken(
  order: RampsOrder,
  direction: TokenAmount['direction'],
): TokenAmount {
  // RampsOrder.cryptoAmount is already human-readable. Activity TokenAmount
  // amounts are treated as atomic when `decimals` is set
  // (`getHumanReadableTokenAmount` → formatUnits), so do not attach decimals
  // from cryptoCurrency metadata here.
  return {
    amount:
      order.cryptoAmount === undefined || order.cryptoAmount === null
        ? undefined
        : String(order.cryptoAmount),
    assetId: order.cryptoCurrency?.assetId,
    symbol: order.cryptoCurrency?.symbol,
    direction,
  };
}
