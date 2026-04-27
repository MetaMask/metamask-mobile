import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import {
  selectAsset,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  selectTronSpecialAssetsBySelectedAccountGroup,
  ///: END:ONLY_INCLUDE_IF
} from '../../../../selectors/assets/assets-list';
import { toFormattedAddress } from '../../../../util/address';
import {
  selectCurrencyRateForChainId,
  selectUSDConversionRateByChainId,
} from '../../../../selectors/currencyRateController';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
import { isTronNativeToken } from '../utils/isTronNativeToken';
///: END:ONLY_INCLUDE_IF

export interface UseTokenBalanceResult {
  balance: string | undefined;
  fiatBalance: string | undefined;
  tokenFormattedBalance: string | undefined;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  isTronNative: boolean;
  stakedTrxAsset: TokenI | undefined;
  inLockPeriodBalance: string | undefined;
  readyForWithdrawalBalance: string | undefined;
  ///: END:ONLY_INCLUDE_IF
}

export interface UseTokenBalanceWithUsdResult extends UseTokenBalanceResult {
  /** Token balance converted to USD regardless of the user's selected display currency. */
  balanceFiatUsd: number;
}

export function useTokenBalance(
  token: TokenI,
  options: { calculateUsdBalance: true },
): UseTokenBalanceWithUsdResult;
export function useTokenBalance(
  token: TokenI,
  options?: { calculateUsdBalance?: false },
): UseTokenBalanceResult;
export function useTokenBalance(
  token: TokenI,
  options?: { calculateUsdBalance?: boolean },
): UseTokenBalanceResult | UseTokenBalanceWithUsdResult {
  const processedAsset = useSelector((state: RootState) =>
    selectAsset(state, {
      address: toFormattedAddress(token.address),
      chainId: token.chainId as Hex,
      isStaked: Boolean(token.isStaked),
    }),
  );

  const conversionRate = useSelector((state: RootState) =>
    options?.calculateUsdBalance
      ? selectCurrencyRateForChainId(state, token.chainId as Hex)
      : undefined,
  );
  const usdConversionRate = useSelector((state: RootState) =>
    options?.calculateUsdBalance
      ? selectUSDConversionRateByChainId(state, token.chainId as Hex)
      : undefined,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const {
    stakedTrxForEnergy,
    stakedTrxForBandwidth,
    trxInLockPeriod,
    trxReadyForWithdrawal,
  } = useSelector(selectTronSpecialAssetsBySelectedAccountGroup);

  const isTronNative = isTronNativeToken(token);

  const totalStaked =
    (Number(stakedTrxForEnergy?.balance) || 0) +
    (Number(stakedTrxForBandwidth?.balance) || 0);

  const stakedTrxAsset =
    isTronNative && totalStaked > 0
      ? createStakedTrxAsset(
          token,
          stakedTrxForEnergy?.balance,
          stakedTrxForBandwidth?.balance,
        )
      : undefined;

  const parsedInLockPeriod = trxInLockPeriod
    ? parseFloat(trxInLockPeriod.balance)
    : 0;
  const inLockPeriodBalance =
    isTronNative && parsedInLockPeriod > 0
      ? formatWithThreshold(parsedInLockPeriod, 0.00001, I18n.locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 5,
        }) || undefined
      : undefined;

  const parsedReadyForWithdrawal = trxReadyForWithdrawal
    ? parseFloat(trxReadyForWithdrawal.balance)
    : 0;
  const readyForWithdrawalBalance =
    isTronNative && parsedReadyForWithdrawal > 0
      ? formatWithThreshold(parsedReadyForWithdrawal, 0.00001, I18n.locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 5,
        }) || undefined
      : undefined;
  ///: END:ONLY_INCLUDE_IF

  const balance = processedAsset?.balance;

  const base: UseTokenBalanceResult = {
    balance,
    fiatBalance: processedAsset?.balanceFiat,
    tokenFormattedBalance: balance
      ? `${balance} ${processedAsset.symbol}`
      : undefined,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    inLockPeriodBalance,
    readyForWithdrawalBalance,
    ///: END:ONLY_INCLUDE_IF
  };

  if (!options?.calculateUsdBalance) {
    return base;
  }

  const computedUsdBalance = (() => {
    if (!conversionRate || !usdConversionRate || !processedAsset?.balanceFiat) {
      return 0;
    }
    const fiatInSelectedCurrency = parseFloat(
      processedAsset.balanceFiat.replace(/[^0-9.]/g, ''),
    );
    if (isNaN(fiatInSelectedCurrency)) return 0;
    return (fiatInSelectedCurrency / conversionRate) * usdConversionRate;
  })();

  return { ...base, balanceFiatUsd: computedUsdBalance };
}

export default useTokenBalance;
