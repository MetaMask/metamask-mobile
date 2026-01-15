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
import { PredictClaimConfirmationSelectorsIDs } from '../../../../../UI/Predict/Predict.testIds';
import styleSheet from './predict-claim-amount.styles';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';

export function PredictClaimAmount() {
  const { styles } = useStyles(styleSheet, {});

  const selectedAddress =
    useSelector(selectSelectedInternalAccountAddress) ?? '0x0';

  const winningsFiat = useSelector(
    selectPredictWinFiat({ address: selectedAddress }),
  );
  const winningsPnl = useSelector(
    selectPredictWinPnl({ address: selectedAddress }),
  );

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

export function PredictClaimAmountSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.HeadingLG} color={TextColor.Alternative}>
        {strings('confirm.predict_claim.summary')}
      </Text>
      <Skeleton width={300} height={70} />
      <Skeleton width={200} height={30} />
    </Box>
  );
}
