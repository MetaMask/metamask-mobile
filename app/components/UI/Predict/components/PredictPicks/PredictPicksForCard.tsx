import React from 'react';
import { Box } from '@metamask/design-system-react-native';

import { usePredictPositions } from '../../hooks/usePredictPositions';
import { useLivePositions } from '../../hooks/useLivePositions';
import type { PredictPosition } from '../../types';
import PredictPicksForCardItem from './PredictPicksForCardItem';

interface PredictPicksForCardProps {
  marketId: string;
  testID?: string;
  /**
   * When true, renders a separator line above the positions list
   * Only renders if there are positions to display
   */
  showSeparator?: boolean;
  /**
   * Optional positions array. When provided, skips internal fetching
   * and uses these positions directly.
   */
  positions?: PredictPosition[];
}

const PredictPicksForCard: React.FC<PredictPicksForCardProps> = ({
  marketId,
  testID = 'predict-picks-for-card',
  showSeparator = false,
  positions: positionsProp,
}) => {
  const { positions: fetchedPositions } = usePredictPositions({
    marketId,
    autoRefreshTimeout: positionsProp ? undefined : 10000,
    loadOnMount: !positionsProp,
    refreshOnFocus: !positionsProp,
  });

  const basePositions = positionsProp ?? fetchedPositions;
  const { livePositions } = useLivePositions(basePositions);

  if (livePositions.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="flex-col gap-2">
      {showSeparator && (
        <Box
          testID={`${testID}-separator`}
          twClassName="h-px bg-border-muted my-2"
        />
      )}
      {livePositions.map((position) => (
        <PredictPicksForCardItem
          key={position.id}
          position={position}
          testID={testID}
        />
      ))}
    </Box>
  );
};

export default PredictPicksForCard;
