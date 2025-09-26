import { useSelector } from 'react-redux';
import {
  selectConversionRateByChainId,
  selectUSDConversionRateByChainId,
} from '../../../../../selectors/currencyRateController';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { RootState } from '../../../../../reducers';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PERPS_CURRENCY } from '../../constants/perps';
import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';

export function useTransactionPayFiat() {
  const { type } = useTransactionMetadataRequest() ?? {};

  const fiatRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, CHAIN_IDS.MAINNET),
  );

  const usdRate = useSelector((state: RootState) =>
    selectUSDConversionRateByChainId(state, CHAIN_IDS.MAINNET),
  );

  const usdMultiplier = usdRate && fiatRate ? usdRate / fiatRate : 1;
  const multiplier = type === TransactionType.perpsDeposit ? usdMultiplier : 1;

  const currency =
    type === TransactionType.perpsDeposit ? PERPS_CURRENCY : undefined;

  const fiatFormatterOriginal = useFiatFormatter({ currency });

  const formatFiat = useCallback(
    (value: number | string | BigNumber) =>
      fiatFormatterOriginal(new BigNumber(value).multipliedBy(multiplier)),
    [fiatFormatterOriginal, multiplier],
  );

  const convertFiat = useCallback(
    (value: number | string | BigNumber) =>
      new BigNumber(value).multipliedBy(multiplier).toNumber(),
    [multiplier],
  );

  return {
    convertFiat,
    formatFiat,
  };
}
