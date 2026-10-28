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
import { PredictEventScreenTestIds } from '../PredictEventScreen.testIds';

interface EventPositionsSectionProps {
  /** The Predict User's open Positions in this Event's Markets. */
  positions: readonly PredictPosition[];
  isPrivacyMode: boolean;
  /** Opens the Cash Out (sell) Order flow for one Position. */
  onCashOut: (position: PredictPosition) => void;
}

const EventPositionRow = ({
  position,
  isPrivacyMode,
  onCashOut,
}: {
  position: PredictPosition;
  isPrivacyMode: boolean;
  onCashOut: EventPositionsSectionProps['onCashOut'];
}) => (
  <Box
    twClassName="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2"
    testID={PredictEventScreenTestIds.positionRow(
      position.marketId,
      position.side,
    )}
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
      testID={PredictEventScreenTestIds.positionCashOut(
        position.marketId,
        position.side,
      )}
    >
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {strings('predict_next.portfolio.cash_out')}
      </Text>
    </Button>
  </Box>
);

/** The Predict User's open Positions in the presented Event's Markets, each
 * with a Cash Out entry point. The screen renders the section only when at
 * least one Position is held; a failed or empty Positions read renders
 * nothing. */
export const EventPositionsSection = ({
  positions,
  isPrivacyMode,
  onCashOut,
}: EventPositionsSectionProps) => (
  <Box
    testID={PredictEventScreenTestIds.POSITIONS_SECTION}
    twClassName="mt-2 gap-2"
  >
    <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
      {strings('predict_next.event.your_positions')}
    </Text>
    <Box twClassName="gap-2">
      {positions.map((position) => (
        <EventPositionRow
          key={`${position.marketId}-${position.side}`}
          position={position}
          isPrivacyMode={isPrivacyMode}
          onCashOut={onCashOut}
        />
      ))}
    </Box>
  </Box>
);
