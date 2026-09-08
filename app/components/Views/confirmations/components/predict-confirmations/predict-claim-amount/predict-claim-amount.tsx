import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
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
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { RootState } from '../../../../../../reducers';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

export function PredictClaimAmount() {
  const { styles } = useStyles(styleSheet, {});

  const selectedAddress =
    useSelector(selectSelectedInternalAccountAddress) ?? '0x0';

  const winningsFiat = useSelector((state: RootState) =>
    selectPredictWinFiat(state, selectedAddress),
  );
  const winningsPnl = useSelector((state: RootState) =>
    selectPredictWinPnl(state, selectedAddress),
  );

  if (!winningsFiat) {
    return null;
  }

  const formattedWinningsFiat = formatPrice(winningsFiat, {
    maximumDecimals: 2,
  });

  // A push bought above 50c is claimable but pays back less than it cost, so
  // the net P&L can be negative. Sign it by value like the sell preview does.
  const isLoss = winningsPnl < 0;
  const formattedWinningsPnl = `${isLoss ? '-' : '+'}${formatPrice(
    Math.abs(winningsPnl),
    { maximumDecimals: 2 },
  )} (${formatPercentage((winningsPnl / winningsFiat) * 100)})`;

  return (
    <Box
      style={styles.container}
      testID={PredictClaimConfirmationSelectorsIDs.CLAIM_AMOUNT_CONTAINER}
    >
      <Text variant={TextVariant.HeadingLg} color={TextColor.TextAlternative}>
        {strings('confirm.predict_claim.summary')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={styles.value}
      >
        {formattedWinningsFiat}
      </Text>
      {winningsPnl !== 0 && (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={isLoss ? TextColor.ErrorDefault : TextColor.SuccessDefault}
          style={styles.change}
        >
          {formattedWinningsPnl}
        </Text>
      )}
    </Box>
  );
}

export function PredictClaimAmountSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.HeadingLg} color={TextColor.TextAlternative}>
        {strings('confirm.predict_claim.summary')}
      </Text>
      <Skeleton width={300} height={70} />
      <Skeleton width={200} height={30} />
    </Box>
  );
}
