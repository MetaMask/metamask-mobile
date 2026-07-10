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
  'buy' | 'sell' | 'deposit'
>;

export function mapRampOrderType(
  orderType: FiatOrder['orderType'],
): RampActivityKind | null {
  switch (orderType) {
    case OrderOrderTypeEnum.Buy:
      return 'buy';
    case OrderOrderTypeEnum.Sell:
      return 'sell';
    case DepositOrderType.Deposit:
      return 'deposit';
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
    const parsedCaipChainId = isCaipChainId(network)
      ? parseCaipChainId(network)
      : undefined;
    if (parsedCaipChainId && parsedCaipChainId.namespace !== 'eip155') {
      return null;
    }

    const chainReference =
      parsedCaipChainId?.reference ?? getDecimalChainId(network);
    if (!chainReference || Number.isNaN(Number(chainReference))) {
      return null;
    }

    return toCaipChainId('eip155', chainReference);
  } catch {
    return null;
  }
}

export function getRampOrderTransactionHash(
  order: FiatOrder,
  kind: RampActivityKind,
): string | undefined {
  return kind === 'sell' ? order.sellTxHash : order.txHash;
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
  const { assetId, decimals } = getRampOrderCryptoCurrencyMetadata(order);

  return {
    amount:
      order.cryptoAmount === undefined ? undefined : String(order.cryptoAmount),
    assetId,
    decimals,
    symbol: order.cryptocurrency,
    direction,
  };
}
