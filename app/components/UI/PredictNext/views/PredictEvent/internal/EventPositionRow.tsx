import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPosition } from '../../../types';
import { formatSharesAmount } from '../../../utils/formatShares';

interface EventPositionRowProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
  onCashOut: (position: PredictPosition) => void;
  testID?: string;
  cashOutTestID?: string;
}

/** Position row presentation for the isolated EventMarketList. */
export const EventPositionRow = ({
  position,
  isPrivacyMode,
  onCashOut,
  testID,
  cashOutTestID,
}: EventPositionRowProps) => (
  <Box
    twClassName="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2"
    testID={testID}
  >
    <Box twClassName="min-w-0 flex-1 pr-3">
      <Text variant={TextVariant.BodyMd} numberOfLines={1}>
        {position.context?.outcomeLabel ?? position.side}
      </Text>
      {position.context?.marketQuestion ? (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-alternative"
          numberOfLines={1}
        >
          {position.context.marketQuestion}
        </Text>
      ) : null}
      <SensitiveText
        variant={TextVariant.BodySm}
        twClassName="text-alternative"
        isHidden={isPrivacyMode}
        length={SensitiveTextLength.Short}
      >
        {strings('predict_next.portfolio.outcome_shares', {
          outcome: position.context?.outcomeLabel ?? position.side,
          shares: formatSharesAmount(position.shares),
        })}
      </SensitiveText>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Sm}
      onPress={() => onCashOut(position)}
      testID={cashOutTestID}
    >
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {strings('predict_next.portfolio.cash_out')}
      </Text>
    </Button>
  </Box>
);
