import { BigNumber } from 'bignumber.js';
import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { usePredictBalance } from '../../../../../UI/Predict/hooks/usePredictBalance';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import styleSheet from './predict-withdraw-balance.styles';
import { PREDICT_CURRENCY } from '../../../constants/predict';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

export function PredictWithdrawBalance() {
  const { styles } = useStyles(styleSheet, {});
  const formatFiat = useFiatFormatter({ currency: PREDICT_CURRENCY });
  const { data: balance = 0 } = usePredictBalance();

  const balanceFormatted = useMemo(
    () => formatFiat(new BigNumber(balance)),
    [balance, formatFiat],
  );

  return (
    <Box alignItems={AlignItems.center} style={styles.container}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >{`${strings('confirm.available_balance')}${balanceFormatted}`}</Text>
    </Box>
  );
}
