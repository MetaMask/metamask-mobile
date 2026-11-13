import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { InsufficientBalanceBannerSelectorsIDs } from './testIds';
import type { InsufficientBalanceBannerProps } from './types';

export const InsufficientBalanceBanner = ({
  insufficientBalance,
  sourceTokenSymbol,
}: InsufficientBalanceBannerProps) => {
  if (!insufficientBalance) {
    return null;
  }

  return (
    <Box paddingHorizontal={3} paddingBottom={2}>
      <BannerAlert
        descriptionProps={{
          variant: TextVariant.BodySm,
          color: TextColor.TextDefault,
        }}
        severity={BannerAlertSeverity.Warning}
        description={strings('bridge.limit.insufficient_balance_warning', {
          symbol: sourceTokenSymbol,
        })}
        testID={InsufficientBalanceBannerSelectorsIDs.CONTAINER}
      >
        <TextButton
          variant={TextVariant.BodySm}
          onPress={insufficientBalance.onSwapIntoSourceTokenPress}
          testID={
            InsufficientBalanceBannerSelectorsIDs.SWAP_INTO_SOURCE_TOKEN_LINK
          }
        >
          {strings('bridge.limit.swap_into_token', {
            symbol: sourceTokenSymbol,
          })}
        </TextButton>
      </BannerAlert>
    </Box>
  );
};
