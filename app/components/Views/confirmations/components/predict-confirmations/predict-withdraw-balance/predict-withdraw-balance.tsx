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
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-withdraw-balance.styles';
import { strings } from '../../../../../../../locales/i18n';

export function PredictWithdrawBalance() {
  const { styles } = useStyles(styleSheet, {});
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
    <Box alignItems={AlignItems.center} style={styles.container}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >{`${strings('confirm.available_balance')}${balanceFormatted}`}</Text>
    </Box>
  );
}
