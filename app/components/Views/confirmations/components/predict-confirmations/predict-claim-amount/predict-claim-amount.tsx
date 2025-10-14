import React, { useMemo } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-amount.styles';
import { RootState } from '../../../../../../reducers';
import { selectPredictClaimDataByTransactionId } from '../predict-temp';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';

export function PredictClaimAmount() {
  const { styles } = useStyles(styleSheet, {});
  const { id: transactionId } = useTransactionMetadataRequest() ?? {};
  const formatFiat = useFiatFormatter();

  const { winningsFiat, changeFiat } =
    useSelector((state: RootState) =>
      selectPredictClaimDataByTransactionId(state, transactionId ?? ''),
    ) ?? {};

  const changePercent = useMemo(
    () =>
      new BigNumber(changeFiat ?? 1)
        .dividedBy(winningsFiat ?? 1)
        .multipliedBy(100)
        .toFixed(2),
    [winningsFiat, changeFiat],
  );

  const changeFormatted = useMemo(
    () => formatFiat(new BigNumber(changeFiat ?? 0)),
    [changeFiat, formatFiat],
  );

  const winningsFormatted = useMemo(
    () => formatFiat(new BigNumber(winningsFiat ?? 0)),
    [winningsFiat, formatFiat],
  );

  if (!(winningsFiat && changeFiat)) {
    return null;
  }

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.HeadingLG} color={TextColor.Alternative}>
        {strings('confirm.predict_claim.summary')}
      </Text>
      <Text variant={TextVariant.BodyMDMedium} style={styles.value}>
        {winningsFormatted}
      </Text>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Success}
        style={styles.change}
      >
        {`+${changeFormatted} (${changePercent}%)`}
      </Text>
    </Box>
  );
}
