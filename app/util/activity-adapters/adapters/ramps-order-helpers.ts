import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import type { CaipChainId } from '@metamask/utils';
import type { Status, TokenAmount } from '../types';
import {
  caipChainIdFromAssetId,
  isPlausibleRampTxHash,
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
 * Resolves CAIP-2 chain id for a RampsController order.
 *
 * Tries each source in order and falls through when a value is present but
 * unparseable (e.g. Coinbase's network name string `"ethereum"`). Generic
 * providers often return a free-form network name while still attaching a
 * real CAIP `cryptoCurrency.chainId` / `assetId`.
 *
 * Precedence:
 * 1. `network.chainId` when `network` is an object
 * 2. `network` when it is a decimal or CAIP string
 * 3. `cryptoCurrency.chainId`
 * 4. chain segment of `cryptoCurrency.assetId`
 */
export function toRampsOrderCaipChainId(order: RampsOrder): CaipChainId | null {
  const network = order.network as RampsOrder['network'] | string | null;

  if (network && typeof network === 'object' && network.chainId) {
    const fromObject = toRampOrderCaipChainId(network.chainId);
    if (fromObject) {
      return fromObject;
    }
  }

  if (typeof network === 'string' && network) {
    const fromString = toRampOrderCaipChainId(network);
    if (fromString) {
      return fromString;
    }
  }

  if (order.cryptoCurrency?.chainId) {
    const fromCrypto = toRampOrderCaipChainId(order.cryptoCurrency.chainId);
    if (fromCrypto) {
      return fromCrypto;
    }
  }

  return caipChainIdFromAssetId(order.cryptoCurrency?.assetId);
}

export function getRampsOrderTransactionHash(
  order: RampsOrder,
): string | undefined {
  return isPlausibleRampTxHash(order.txHash) ? order.txHash : undefined;
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
