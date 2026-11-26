import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictAmount } from '../../../types';
import { formatUsd } from '../../../utils/formatUsd';
import { PredictDepositScreenTestIds } from '../PredictDepositScreen.testIds';

/**
 * The transfer went out and the backend has it. The legacy deposit says the
 * same in its pending toast ("Adding funds"). Done closes the screen; the
 * deposit's status line on Home and Portfolio takes over (PRED-1189).
 */
export const DepositProcessing = ({
  amount,
  onDone,
}: {
  amount: PredictAmount;
  onDone: () => void;
}): React.JSX.Element => (
  <Box
    className="flex-1 justify-between px-4 pb-4"
    testID={PredictDepositScreenTestIds.PROCESSING}
  >
    <Box className="flex-1 items-center justify-center gap-3">
      <Icon
        name={IconName.Clock}
        size={IconSize.Xl}
        color={IconColor.IconAlternative}
      />
      <Text variant={TextVariant.HeadingMd} accessibilityRole="header">
        {strings('predict_next.deposit.processing_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        className="text-center"
      >
        {strings('predict_next.deposit.processing_description', {
          amount: formatUsd(amount),
        })}
      </Text>
    </Box>
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      isFullWidth
      onPress={onDone}
      testID={PredictDepositScreenTestIds.DONE}
    >
      {strings('predict_next.deposit.done')}
    </Button>
  </Box>
);
