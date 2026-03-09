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
///: BEGIN:ONLY_INCLUDE_IF(tron)
import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF

export interface UseTokenBalanceResult {
  balance: string | undefined;
  fiatBalance: string | undefined;
  tokenFormattedBalance: string | undefined;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  isTronNative: boolean;
  stakedTrxAsset: TokenI | undefined;
  inLockPeriodBalance: string | undefined;
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

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const { stakedTrxForEnergy, stakedTrxForBandwidth, trxInLockPeriod } =
    useSelector(selectTronSpecialAssetsBySelectedAccountGroup);

  const isTronNative =
    token.ticker === 'TRX' && String(token.chainId).startsWith('tron:');

  const stakedTrxAsset = isTronNative
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
  ///: END:ONLY_INCLUDE_IF

  const balance = processedAsset?.balance;

  return {
    balance,
    fiatBalance: processedAsset?.balanceFiat,
    tokenFormattedBalance: balance
      ? `${balance} ${processedAsset.symbol}`
      : undefined,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    inLockPeriodBalance,
    ///: END:ONLY_INCLUDE_IF
  };
};

export default useTokenBalance;
