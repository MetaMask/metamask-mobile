import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import {
  renderFromWei,
  limitToMaximumDecimalPlaces,
  weiToFiatNumber,
  renderFiat,
} from '../../../../util/number';
import { RootState } from '../../../../reducers';
import { TransactionMeta } from '@metamask/transaction-controller';
import usePooledStakingVaultMetadata from '../../../UI/Stake/hooks/usePooledStakingVaultMetadata';

export const useStakingDetails = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const txValueWei = transactionMeta?.txParams?.value;

  const { annualRewardRateDecimal, annualRewardRate } =
    usePooledStakingVaultMetadata();

  const amountEth = renderFromWei(txValueWei || '0');

  const annualRewardsETH = `${limitToMaximumDecimalPlaces(
    parseFloat(amountEth) * annualRewardRateDecimal,
    5,
  )} ETH`;

  const nativeFiatRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(
      state,
      (transactionMeta as TransactionMeta).chainId,
    ),
  ) as number;
  const currentCurrency = useSelector(selectCurrentCurrency);

  const fiatAmount = weiToFiatNumber(
    txValueWei || '0',
    nativeFiatRate || 0,
    2,
  ).toString();
  const annualRewardsFiat = renderFiat(
    parseFloat(fiatAmount) * annualRewardRateDecimal,
    currentCurrency,
    2,
  );

  return { apr: annualRewardRate, annualRewardsFiat, annualRewardsETH };
};
