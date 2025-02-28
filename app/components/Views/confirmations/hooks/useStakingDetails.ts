import { TransactionMeta } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import I18n from '../../../../../locales/i18n';
import { formatAmount } from '../../../../components/UI/SimulationDetails/formatAmount';
import useVaultData from '../../../../components/UI/Stake/hooks/useVaultData';
import { RootState } from '../../../../reducers';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import { fromWei, hexToBN } from '../../../../util/number';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export const useStakingDetails = () => {
    const transactionMeta = useTransactionMetadataRequest();
    const txValueWei = transactionMeta?.txParams?.value;
    const fiatFormatter = useFiatFormatter();
    const locale = I18n.locale;

    const { annualRewardRate: apr, annualRewardRateDecimal } = useVaultData();

    const ethAmountInWei = hexToBN(txValueWei || '0x0');
    const ethAmountInBN = new BigNumber(fromWei(ethAmountInWei, 'ether'));
    const annualRewardsInBN = ethAmountInBN.times(annualRewardRateDecimal);
    const annualRewardsETH = `${formatAmount(locale, annualRewardsInBN)} ETH`;

    const nativeFiatRate = useSelector(
      (state: RootState) => selectConversionRateByChainId(state, (transactionMeta as TransactionMeta).chainId)
    ) as number;
    const nativeConversionRateInBN = new BigNumber(nativeFiatRate || 0);
    const preciseFiatValue = ethAmountInBN.times(nativeConversionRateInBN);
    const annualRewardsFiatValue = preciseFiatValue.times(annualRewardRateDecimal);
    const annualRewardsFiat = annualRewardsFiatValue && fiatFormatter(annualRewardsFiatValue);

    return { apr, annualRewardsFiat, annualRewardsETH };
}
