import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';

import { useTransactionMetadataRequest } from '../hooks/useTransactionMetadataRequest';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import I18n from '../../../../../locales/i18n';
import { formatAmount } from '../../../../components/UI/SimulationDetails/formatAmount';
import { fromWei, hexToBN } from '../../../../util/number';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { RootState } from '../../../../reducers';

// TODO: This hook will be extended to calculate token and fiat information from transaction metadata on upcoming redesigned confirmations
export const useTokenValues = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const fiatFormatter = useFiatFormatter();
  const locale = I18n.locale;
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, transactionMetadata?.chainId as Hex),
  );
  const nativeConversionRateInBN = new BigNumber(nativeConversionRate || 1);

  const ethAmountInWei = hexToBN(transactionMetadata?.txParams?.value);
  const ethAmountInBN = new BigNumber(fromWei(ethAmountInWei, 'ether'));

  const preciseFiatValue = ethAmountInBN.times(nativeConversionRateInBN);

  const tokenAmountDisplayValue = formatAmount(locale, ethAmountInBN);
  const fiatDisplayValue =
    preciseFiatValue && fiatFormatter(preciseFiatValue.toNumber());

  return {
    tokenAmountDisplayValue,
    fiatDisplayValue,
  };
};
