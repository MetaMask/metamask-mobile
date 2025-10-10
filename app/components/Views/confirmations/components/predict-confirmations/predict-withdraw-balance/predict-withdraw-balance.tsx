import React, { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../../reducers';
import { selectPredictBalanceByAddress } from '../predict-temp';
import { useSelector } from 'react-redux';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';

export function PredictWithdrawBalance() {
  const transactionMeta = useTransactionMetadataRequest();
  const from = transactionMeta?.txParams?.from as Hex;
  const formatFiat = useFiatFormatter();

  const balanceFiat = useSelector((state: RootState) =>
    selectPredictBalanceByAddress(state, from),
  );

  const balanceFormatted = useMemo(
    () => formatFiat(new BigNumber(balanceFiat)),
    [balanceFiat, formatFiat],
  );

  return (
    <Box alignItems={AlignItems.center}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >{`Available: ${balanceFormatted}`}</Text>
    </Box>
  );
}
