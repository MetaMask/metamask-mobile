import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import type { Hex } from '@metamask/utils';

import { RootState } from '../../../../../reducers';
import {
  selectConversionRateByChainId,
  selectUSDConversionRateByChainId,
} from '../../../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../../util/address';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import useHideFiatForTestnet from '../../../../hooks/useHideFiatForTestnet';
import { TOKEN_VALUE_UNLIMITED_THRESHOLD } from '../../constants/approve';
import { ApproveMethod } from '../../types/approve';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../useApproveTransactionData';

/**
 * Looks up a token's native-denominated price from market data, trying
 * checksum and case-insensitive keys because rates are keyed inconsistently.
 */
function getTokenNativePrice(
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined,
  tokenAddress: string,
): number | undefined {
  if (!contractExchangeRates) {
    return undefined;
  }

  const checksum = safeToChecksumAddress(tokenAddress);
  const checksumPrice = checksum
    ? contractExchangeRates[checksum]?.price
    : undefined;
  if (checksumPrice != null) {
    return checksumPrice;
  }

  const lower = tokenAddress.toLowerCase();
  const matchingKey = Object.keys(contractExchangeRates).find(
    (key) => key.toLowerCase() === lower,
  );

  return matchingKey
    ? (contractExchangeRates[matchingKey]?.price ?? undefined)
    : undefined;
}

/**
 * Returns the formatted fiat value of the spending cap being approved, for
 * Blockaid confirm-anyway copy ("If you continue, your $5,000.00 can't be
 * recovered."). Uses the full cap, even when it exceeds the user's balance.
 *
 * Returns null when no amount should be displayed: not an ERC20 approve,
 * unlimited / revoke / decreaseAllowance, missing conversion, fiat hidden on
 * testnets, or still loading. Callers fall back to amount-less copy.
 */
export function useApprovedAmountFiat(): string | null {
  const transactionMetadata = useTransactionMetadataRequest();
  const {
    approveMethod,
    isLoading,
    isRevoke,
    rawAmount,
    token: permit2Token,
  } = useApproveTransactionData();
  const chainId = transactionMetadata?.chainId as Hex | undefined;
  const hideFiatForTestnet = useHideFiatForTestnet(chainId);
  const fiatFormatter = useFiatFormatter();

  const tokenAddress = (permit2Token ?? transactionMetadata?.txParams?.to) as
    | string
    | undefined;

  const contractExchangeRates = useSelector((state: RootState) =>
    chainId ? selectContractExchangeRatesByChainId(state, chainId) : undefined,
  );
  const nativeConversionRate =
    useSelector((state: RootState) =>
      chainId ? selectConversionRateByChainId(state, chainId) : 0,
    ) ?? 0;
  const nativeUsdRate = useSelector((state: RootState) =>
    chainId ? selectUSDConversionRateByChainId(state, chainId) : undefined,
  );

  if (
    hideFiatForTestnet ||
    isLoading ||
    isRevoke ||
    approveMethod === ApproveMethod.DECREASE_ALLOWANCE ||
    approveMethod === ApproveMethod.SET_APPROVAL_FOR_ALL ||
    !rawAmount ||
    !tokenAddress ||
    !chainId
  ) {
    return null;
  }

  const amount = new BigNumber(rawAmount);
  if (
    !amount.isFinite() ||
    amount.isZero() ||
    amount.isGreaterThan(TOKEN_VALUE_UNLIMITED_THRESHOLD)
  ) {
    return null;
  }

  const tokenNativePrice = getTokenNativePrice(
    contractExchangeRates,
    tokenAddress,
  );
  if (!tokenNativePrice) {
    return null;
  }

  const amountInNative = amount.times(tokenNativePrice);
  const totalFiat = amountInNative.times(nativeConversionRate);
  const totalUsd = nativeUsdRate
    ? amountInNative.times(nativeUsdRate)
    : new BigNumber(0);

  // Unavailable native or USD conversion totals to zero. Do not display an
  // amount we cannot convert or check.
  if (totalFiat.isZero() || totalUsd.isZero()) {
    return null;
  }

  return fiatFormatter(totalFiat);
}
