import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { selectContractExchangeRatesByChainId } from '../../../../selectors/tokenRatesController';
import {
  balanceToFiatNumber,
  renderFiat,
} from '../../../../util/number/bigint';
import { safeToChecksumAddress } from '../../../../util/address';
import { getMaybeHexChainId } from '../../../../util/bridge';
import {
  getHumanReadableTokenAmount,
  isFailedOrCancelledTransfer,
  toMarketRateLookupToken,
  type ActivityFee,
  type ActivityListItem,
  type TokenAmount,
} from '../../../../util/activity-adapters';

type FiatCurrency = Parameters<typeof renderFiat>[1];
type MultichainAssetRates = Record<
  string,
  { rate?: string | number | null } | undefined
>;

export interface ActivityFeeFiatRow {
  label: string;
  value?: string;
  fee: ActivityFee;
}

export interface ActivityAmountsFiat {
  feeRows: ActivityFeeFiatRow[];
  totalFiat?: string;
}

const FIAT_DECIMALS = 2;

/** A CAIP asset id refers to the chain's native token (e.g. `slip44`/`native`). */
function isNativeAssetId(assetId: string | undefined): boolean {
  return Boolean(
    assetId?.includes('/slip44:') || assetId?.includes('/native:'),
  );
}

function isNativeAsset(token: TokenAmount): boolean {
  return isNativeAssetId(token.assetId);
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
  multichainAssetRates: MultichainAssetRates | undefined,
): number | undefined {
  if (!token || token.isUnlimitedApproval) {
    return undefined;
  }
  const human = getHumanReadableTokenAmount(token);
  if (human === undefined) {
    return undefined;
  }
  const parsedAmount = Number.parseFloat(human);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return undefined;
  }

  const multichainAssetRate = token.assetId
    ? multichainAssetRates?.[token.assetId]?.rate
    : undefined;
  if (multichainAssetRate) {
    return balanceToFiatNumber(parsedAmount, Number(multichainAssetRate), 1);
  }

  if (!conversionRate) {
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
  return balanceToFiatNumber(parsedAmount, conversionRate, exchangeRate);
}

function feeToFiatNumber(
  fee: ActivityFee,
  conversionRate: number | null | undefined,
): number | undefined {
  if (!conversionRate || fee.amount === undefined) {
    return undefined;
  }
  // The conversion rate is the native token's rate, so only native fees can be
  // converted. Resource fees (e.g. Tron Bandwidth/Energy) are non-native and
  // must not be priced at the native rate — that would inflate the total.
  if (isResourceFee(fee)) {
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
  const parsedAmount = Number.parseFloat(human);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return undefined;
  }
  return balanceToFiatNumber(parsedAmount, conversionRate, 1);
}

function feeToTokenAmount(fee: ActivityFee): string | undefined {
  const human = getHumanReadableTokenAmount({
    amount: fee.amount,
    decimals: fee.decimals,
    direction: 'out',
  });
  if (human === undefined) {
    return undefined;
  }
  const parsedAmount = Number.parseFloat(human);
  return Number.isFinite(parsedAmount) && parsedAmount > 0 ? human : undefined;
}

/** Title-cases a fee symbol for use as a fallback label (e.g. `BANDWIDTH` -> `Bandwidth`). */
function titleCaseSymbol(symbol: string): string {
  return symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();
}

/**
 * Known resource symbols reported as fees by chains that meter execution
 * (e.g. Tron Bandwidth/Energy). The snap surfaces these as virtual assets, so
 * their CAIP `assetId` is unreliable — the symbol is the dependable signal.
 */
const RESOURCE_FEE_LABEL_BY_SYMBOL: Record<string, string> = {
  BANDWIDTH: 'activity_details.bandwidth_fee',
  ENERGY: 'activity_details.energy_fee',
};

/**
 * A `base` fee is a "resource" fee (not the native network fee) when it is paid
 * in a recognized resource (Bandwidth/Energy) or, more generally, in a
 * non-native asset. Such fees get a distinct label so they don't duplicate the
 * native "Network fee" row, and are kept out of native-rate fiat conversion.
 */
function isResourceFee(fee: ActivityFee): boolean {
  if (fee.symbol && fee.symbol.toUpperCase() in RESOURCE_FEE_LABEL_BY_SYMBOL) {
    return true;
  }
  return Boolean(fee.assetId && !isNativeAssetId(fee.assetId));
}

/**
 * Resolves the label for a resource fee. Some chains (e.g. Tron) report
 * resource consumption — Bandwidth, Energy — as a second `base` fee. Labeling
 * these by their resource keeps them distinct from the native "Network fee"
 * row rather than duplicating it.
 */
function getResourceFeeLabel(symbol: string): string {
  const key = RESOURCE_FEE_LABEL_BY_SYMBOL[symbol.toUpperCase()];
  return key ? strings(key) : titleCaseSymbol(symbol);
}

function getFeeLabel(fee: ActivityFee): string {
  switch (fee.type) {
    case 'base':
      if (fee.symbol && isResourceFee(fee)) {
        return getResourceFeeLabel(fee.symbol);
      }
      return strings('activity_details.network_fee');
    case 'bridge':
      return strings('activity_details.bridge_fee');
    default:
      return strings('activity_details.transaction_fee');
  }
}

/**
 * Converts an item's native fees and token amount to fiat for the details
 * screen: a fiat value per fee row plus a fiat "Total amount" (token + fees).
 * Returns empty rows / undefined total when no fiat rate is available, so
 * callers render nothing rather than a misleading value.
 */
export function useActivityAmountsFiat(
  item: ActivityListItem,
  totalToken?: TokenAmount,
): ActivityAmountsFiat {
  const hexChainId = getMaybeHexChainId(item.chainId);
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
  const multichainAssetRates = useSelector(selectMultichainAssetsRates);

  const itemToken =
    'token' in item.data
      ? (item.data.token as TokenAmount | undefined)
      : undefined;

  // A failed/cancelled send transferred nothing, so its token value must not
  // count toward the total — only the gas that was actually spent (the fee
  // rows) should. Drop the token so the total reflects what left the wallet.
  const token = isFailedOrCancelledTransfer(item)
    ? undefined
    : (totalToken ?? itemToken);
  const fees: ActivityFee[] = 'fees' in item.data ? (item.data.fees ?? []) : [];

  const tokenFiat = tokenToFiatNumber(
    token,
    conversionRate,
    hexChainId,
    contractExchangeRates,
    multichainAssetRates,
  );

  const feeRows: ActivityFeeFiatRow[] = [];
  let feeFiatTotal = 0;
  let hasFee = false;

  for (const fee of fees) {
    const feeFiat = feeToFiatNumber(fee, conversionRate);
    if (feeFiat !== undefined && currentCurrency) {
      hasFee = true;
      feeFiatTotal += feeFiat;
    }

    const feeValue =
      feeFiat !== undefined && currentCurrency
        ? renderFiat(feeFiat, currentCurrency as FiatCurrency, FIAT_DECIMALS)
        : feeToTokenAmount(fee);

    if (feeValue) {
      feeRows.push({
        label: getFeeLabel(fee),
        value: feeValue,
        fee,
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
