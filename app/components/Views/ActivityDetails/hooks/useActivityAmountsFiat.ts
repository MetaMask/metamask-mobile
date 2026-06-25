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

function getFeeLabel(fee: ActivityFee): string {
  switch (fee.type) {
    case 'base':
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

  const token =
    totalToken ??
    ('token' in item.data
      ? (item.data.token as TokenAmount | undefined)
      : undefined);
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
