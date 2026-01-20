import { BigNumber } from 'bignumber.js';
import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { usePredictBalance } from '../../../../../UI/Predict/hooks/usePredictBalance';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import styleSheet from './predict-withdraw-balance.styles';
import { PREDICT_CURRENCY } from '../../../constants/predict';

export function PredictWithdrawBalance() {
  const { styles } = useStyles(styleSheet, {});
  const formatFiat = useFiatFormatter({ currency: PREDICT_CURRENCY });
  const { balance } = usePredictBalance({ loadOnMount: true });

  const balanceFormatted = useMemo(
    () => formatFiat(new BigNumber(balance)),
    [balance, formatFiat],
  );

  return (
    <Box alignItems={AlignItems.center} style={styles.container}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >{`${strings('confirm.available_predict_balance')}${balanceFormatted}`}</Text>
    </Box>
  );
}
