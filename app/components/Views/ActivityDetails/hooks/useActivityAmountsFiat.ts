import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../../selectors/tokenRatesController';
import {
  balanceToFiatNumber,
  renderFiat,
} from '../../../../util/number/bigint';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  getHumanReadableTokenAmount,
  toMarketRateLookupToken,
  type ActivityFee,
  type ActivityListItem,
  type TokenAmount,
} from '../../../../util/activity-adapters';

type FiatCurrency = Parameters<typeof renderFiat>[1];

export interface ActivityFeeFiatRow {
  label: string;
  value: string;
}

export interface ActivityAmountsFiat {
  feeRows: ActivityFeeFiatRow[];
  totalFiat?: string;
}

const FIAT_DECIMALS = 2;

function getHexChainId(caipChainId: string): Hex | undefined {
  if (caipChainId.startsWith('0x')) {
    return caipChainId as Hex;
  }
  const decimal = caipChainId.split(':')[1];
  if (!decimal) {
    return undefined;
  }
  const parsed = Number.parseInt(decimal, 10);
  return Number.isNaN(parsed) ? undefined : (`0x${parsed.toString(16)}` as Hex);
}

function isNativeAsset(token: TokenAmount): boolean {
  return Boolean(
    token.assetId?.includes('/slip44:') || token.assetId?.includes('/native:'),
  );
}

/** Mirrors the activity row's market-price lookup (checksum, then lowercase). */
function getMarketPrice(
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined,
  address: string,
): number | undefined {
  if (!contractExchangeRates) {
    return undefined;
  }
  const checksum = safeToChecksumAddress(address);
  const checksumPrice = checksum
    ? contractExchangeRates[checksum]?.price
    : undefined;
  if (checksumPrice !== undefined && checksumPrice !== null) {
    return checksumPrice;
  }
  const lower = address.toLowerCase();
  const key = Object.keys(contractExchangeRates).find(
    (k) => k.toLowerCase() === lower,
  );
  const price = key ? contractExchangeRates[key]?.price : undefined;
  return price ?? undefined;
}

function tokenToFiatNumber(
  token: TokenAmount | undefined,
  conversionRate: number | null | undefined,
  hexChainId: Hex | undefined,
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined,
): number | undefined {
  if (!token || !conversionRate || token.isUnlimitedApproval) {
    return undefined;
  }
  const human = getHumanReadableTokenAmount(token);
  if (human === undefined) {
    return undefined;
  }
  const lookupToken = hexChainId
    ? toMarketRateLookupToken(token, hexChainId)
    : undefined;
  const exchangeRate = isNativeAsset(token)
    ? 1
    : lookupToken
      ? getMarketPrice(contractExchangeRates, lookupToken.address)
      : undefined;
  if (!exchangeRate) {
    return undefined;
  }
  return balanceToFiatNumber(
    Number.parseFloat(human),
    conversionRate,
    exchangeRate,
  );
}

function feeToFiatNumber(
  fee: ActivityFee,
  conversionRate: number | null | undefined,
): number | undefined {
  if (!conversionRate || fee.amount === undefined) {
    return undefined;
  }
  // Base/network fees are denominated in the chain's native token.
  const human = getHumanReadableTokenAmount({
    amount: fee.amount,
    decimals: fee.decimals,
    direction: 'out',
  });
  if (human === undefined) {
    return undefined;
  }
  return balanceToFiatNumber(Number.parseFloat(human), conversionRate, 1);
}

function getFeeLabel(fee: ActivityFee): string {
  if (fee.type === 'base') {
    return strings('activity_details.network_fee');
  }
  return fee.symbol ?? fee.type;
}

/**
 * Converts an item's native fees and token amount to fiat for the details
 * screen: a fiat value per fee row plus a fiat "Total amount" (token + fees).
 * Returns empty rows / undefined total when no fiat rate is available, so
 * callers render nothing rather than a misleading value.
 */
export function useActivityAmountsFiat(
  item: ActivityListItem,
): ActivityAmountsFiat {
  const hexChainId = getHexChainId(item.chainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector((state: RootState) =>
    hexChainId
      ? selectConversionRateByChainId(state, hexChainId, true)
      : undefined,
  );
  const contractExchangeRates = useSelector((state: RootState) =>
    hexChainId
      ? selectContractExchangeRatesByChainId(state, hexChainId)
      : undefined,
  );

  const token =
    'token' in item.data
      ? (item.data.token as TokenAmount | undefined)
      : undefined;
  const fees: ActivityFee[] = 'fees' in item.data ? (item.data.fees ?? []) : [];

  const tokenFiat = tokenToFiatNumber(
    token,
    conversionRate,
    hexChainId,
    contractExchangeRates,
  );

  const feeRows: ActivityFeeFiatRow[] = [];
  let feeFiatTotal = 0;
  let hasFee = false;
  for (const fee of fees) {
    const feeFiat = feeToFiatNumber(fee, conversionRate);
    if (feeFiat !== undefined && currentCurrency) {
      hasFee = true;
      feeFiatTotal += feeFiat;
      feeRows.push({
        label: getFeeLabel(fee),
        value: renderFiat(
          feeFiat,
          currentCurrency as FiatCurrency,
          FIAT_DECIMALS,
        ),
      });
    }
  }

  const canShowTotal =
    Boolean(currentCurrency) && (tokenFiat !== undefined || hasFee);
  const totalFiat = canShowTotal
    ? renderFiat(
        (tokenFiat ?? 0) + feeFiatTotal,
        currentCurrency as FiatCurrency,
        FIAT_DECIMALS,
      )
    : undefined;

  return { feeRows, totalFiat };
}
