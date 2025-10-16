import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { PredictPositionStatus } from '../../../../../UI/Predict';
import { selectPredictClaimablePositions } from '../../../../../UI/Predict/selectors/predictController';
import {
  formatPercentage,
  formatPrice,
} from '../../../../../UI/Predict/utils/format';
import styleSheet from './predict-claim-amount.styles';

export function PredictClaimAmount() {
  const { styles } = useStyles(styleSheet, {});

  const claimablePositions = useSelector(selectPredictClaimablePositions);
  const wonPositions = useMemo(
    () =>
      claimablePositions?.filter(
        (position) => position.status === PredictPositionStatus.WON,
      ) ?? [],
    [claimablePositions],
  );

  const winningsFiat = useMemo(
    () =>
      wonPositions.reduce((acc, position) => acc + position.currentValue, 0),
    [wonPositions],
  );

  const winningsPnl = useMemo(
    () => wonPositions.reduce((acc, position) => acc + position.cashPnl, 0),
    [wonPositions],
  );

  if (!(winningsFiat && winningsPnl)) {
    return null;
  }

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.HeadingLG} color={TextColor.Alternative}>
        {strings('confirm.predict_claim.summary')}
      </Text>
      <Text variant={TextVariant.BodyMDMedium} style={styles.value}>
        {formatPrice(winningsFiat, { maximumDecimals: 2 })}
      </Text>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Success}
        style={styles.change}
      >
        {`+${formatPrice(winningsPnl, {
          maximumDecimals: 2,
        })} (${formatPercentage((winningsPnl / winningsFiat) * 100)})`}
      </Text>
    </Box>
  );
}
