import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  isCaipChainId,
  parseCaipChainId,
  toCaipChainId,
  type CaipChainId,
} from '@metamask/utils';
import { FIAT_ORDER_STATES } from '../../../constants/on-ramp';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { DepositOrderType } from '../../../components/UI/Ramp/types/legacyDeposit';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../../reducers/fiatOrders/types';
import { getDecimalChainId } from '../../../util/networks';
import type { ActivityListItem, Status, TokenAmount } from '../types';

export type RampActivityKind = Extract<
  ActivityListItem['type'],
  'buy' | 'sell'
>;

export function mapRampOrderType(
  orderType: FiatOrder['orderType'],
): RampActivityKind | null {
  switch (orderType) {
    case OrderOrderTypeEnum.Buy:
    case DepositOrderType.Deposit:
      return 'buy';
    case OrderOrderTypeEnum.Sell:
      return 'sell';
    default:
      return null;
  }
}

export function mapRampOrderStatus(state: FiatOrder['state']): Status {
  switch (state) {
    case FIAT_ORDER_STATES.COMPLETED:
      return 'success';
    case FIAT_ORDER_STATES.FAILED:
      return 'failed';
    case FIAT_ORDER_STATES.CANCELLED:
      return 'cancelled';
    case FIAT_ORDER_STATES.PENDING:
    case FIAT_ORDER_STATES.CREATED:
    default:
      return 'pending';
  }
}

export function toRampOrderCaipChainId(network: string): CaipChainId | null {
  try {
    if (!network) {
      return null;
    }

    if (isCaipChainId(network)) {
      const { namespace, reference } = parseCaipChainId(network);
      return toCaipChainId(namespace, reference);
    }

    const chainReference = getDecimalChainId(network);
    if (!chainReference || Number.isNaN(Number(chainReference))) {
      return null;
    }

    return toCaipChainId('eip155', chainReference);
  } catch {
    return null;
  }
}

/**
 * Placeholder / non-on-chain values that must not be used as Activity dedup
 * keys. Multiple completed test/provider orders have been observed with
 * `txHash: "DUMMY_TX_ID"`, which collapsed distinct buys into one Activity row.
 */
function isUsableRampTransactionHash(
  hash: string | undefined | null,
): hash is string {
  if (typeof hash !== 'string') {
    return false;
  }
  const normalized = hash.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (
    normalized === 'dummy_tx_id' ||
    normalized === 'null' ||
    normalized === 'undefined'
  ) {
    return false;
  }
  return true;
}

export function getRampOrderTransactionHash(
  order: FiatOrder,
  kind: RampActivityKind,
): string | undefined {
  const hash = kind === 'sell' ? order.sellTxHash : order.txHash;
  return isUsableRampTransactionHash(hash) ? hash : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function getRampOrderCryptoCurrencyMetadata(order: FiatOrder) {
  const cryptoCurrency = asRecord(asRecord(order.data)?.cryptoCurrency);
  const assetId = cryptoCurrency?.assetId;
  const decimals = cryptoCurrency?.decimals;

  return {
    assetId: typeof assetId === 'string' ? assetId : undefined,
    decimals: typeof decimals === 'number' ? decimals : undefined,
  };
}

export function toRampOrderToken(
  order: FiatOrder,
  direction: TokenAmount['direction'],
): TokenAmount {
  const { assetId } = getRampOrderCryptoCurrencyMetadata(order);

  // FiatOrder.cryptoAmount is already human-readable. Activity TokenAmount
  // amounts are treated as atomic when `decimals` is set
  // (`getHumanReadableTokenAmount` → formatUnits), so do not attach decimals
  // from cryptoCurrency metadata here.
  return {
    amount:
      order.cryptoAmount === undefined ? undefined : String(order.cryptoAmount),
    assetId,
    symbol: order.cryptocurrency,
    direction,
  };
}
