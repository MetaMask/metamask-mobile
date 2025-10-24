import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import {
  selectPredictWinFiat,
  selectPredictWinPnl,
} from '../../../../../UI/Predict/selectors/predictController';
import {
  formatPercentage,
  formatPrice,
} from '../../../../../UI/Predict/utils/format';
import { PredictClaimConfirmationSelectorsIDs } from '../../../../../../../e2e/selectors/Predict/Predict.selectors';
import styleSheet from './predict-claim-amount.styles';

export function PredictClaimAmount() {
  const { styles } = useStyles(styleSheet, {});
  const winningsFiat = useSelector(selectPredictWinFiat);
  const winningsPnl = useSelector(selectPredictWinPnl);

  if (!(winningsFiat && winningsPnl)) {
    return null;
  }

  const formattedWinningsFiat = formatPrice(winningsFiat, {
    maximumDecimals: 2,
  });

  const formattedWinningsPnl = `+${formatPrice(winningsPnl, {
    maximumDecimals: 2,
  })} (${formatPercentage((winningsPnl / winningsFiat) * 100)})`;

  return (
    <Box
      style={styles.container}
      testID={PredictClaimConfirmationSelectorsIDs.CLAIM_AMOUNT_CONTAINER}
    >
      <Text variant={TextVariant.HeadingLG} color={TextColor.Alternative}>
        {strings('confirm.predict_claim.summary')}
      </Text>
      <Text variant={TextVariant.BodyMDMedium} style={styles.value}>
        {formattedWinningsFiat}
      </Text>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Success}
        style={styles.change}
      >
        {formattedWinningsPnl}
      </Text>
    </Box>
  );
}
