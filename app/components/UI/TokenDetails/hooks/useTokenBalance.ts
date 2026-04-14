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
  /** Token balance converted to USD regardless of the user's selected display currency. */
  balanceFiatUsd: number | undefined;
  tokenFormattedBalance: string | undefined;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  isTronNative: boolean;
  stakedTrxAsset: TokenI | undefined;
  inLockPeriodBalance: string | undefined;
  readyForWithdrawalBalance: string | undefined;
  ///: END:ONLY_INCLUDE_IF
}

export const useTokenBalance = (token: TokenI): UseTokenBalanceResult => {
  const processedAsset = useSelector((state: RootState) =>
    selectAsset(state, {
      address: toFormattedAddress(token.address),
      chainId: token.chainId as Hex,
      isStaked: Boolean(token.isStaked),
    }),
  );

  const conversionRate = useSelector((state: RootState) =>
    selectCurrencyRateForChainId(state, token.chainId as Hex),
  );
  const usdConversionRate = useSelector((state: RootState) =>
    selectUSDConversionRateByChainId(state, token.chainId as Hex),
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

  const balanceFiatUsd = (() => {
    if (!conversionRate || !usdConversionRate || !processedAsset?.balanceFiat) {
      return undefined;
    }
    const fiatInSelectedCurrency = parseFloat(
      processedAsset.balanceFiat.replace(/[^0-9.]/g, ''),
    );
    if (isNaN(fiatInSelectedCurrency)) return undefined;
    return (fiatInSelectedCurrency / conversionRate) * usdConversionRate;
  })();

  return {
    balance,
    fiatBalance: processedAsset?.balanceFiat,
    balanceFiatUsd,
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
};

export default useTokenBalance;
