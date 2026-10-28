import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPosition } from '../../../types';
import { PredictEventScreenTestIds } from '../PredictEventScreen.testIds';
import { EventPositionRow } from './EventPositionRow';

interface EventPositionsSectionProps {
  /** The Predict User's open Positions in this Event's Markets. */
  positions: readonly PredictPosition[];
  isPrivacyMode: boolean;
  /** Opens the Cash Out (sell) Order flow for one Position. */
  onCashOut: (position: PredictPosition) => void;
}

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
          testID={PredictEventScreenTestIds.positionRow(
            position.marketId,
            position.side,
          )}
          cashOutTestID={PredictEventScreenTestIds.positionCashOut(
            position.marketId,
            position.side,
          )}
        />
      ))}
    </Box>
  </Box>
);
