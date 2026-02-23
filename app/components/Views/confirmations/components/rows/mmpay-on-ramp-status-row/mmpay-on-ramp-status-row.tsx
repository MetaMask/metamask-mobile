import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { strings } from '../../../../../../../locales/i18n';
import { useMMPayOnRampStatus } from '../../../hooks/pay/useMMPayOnRampStatus';

export function MMPayOnRampStatusRow() {
  const { inProgress, isFailed, isCompleted } = useMMPayOnRampStatus();

  if (inProgress) {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Row}
        gap={1}
      >
        <Spinner />
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('confirm.custom_amount.top_up_in_progress')}
        </Text>
      </Box>
    );
  }

  if (isFailed) {
    return (
      <Box alignItems={BoxAlignItems.Center} gap={3}>
        <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
          {strings('confirm.custom_amount.top_up_failed')}
        </Text>
      </Box>
    );
  }

  if (isCompleted) {
    return (
      <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
        {strings('confirm.custom_amount.top_up_completed')}
      </Text>
    );
  }

  return null;
}
