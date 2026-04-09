import React, { memo } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import PredictPositionDetail from '../../../../components/PredictPositionDetail';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictPosition,
} from '../../../../types';

export interface PredictMarketDetailsPositionsProps {
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  market: PredictMarket | null;
}

const PredictMarketDetailsPositions = memo(
  ({
    activePositions,
    claimablePositions,
    market,
  }: PredictMarketDetailsPositionsProps) => {
    if (
      (activePositions.length > 0 || claimablePositions.length > 0) &&
      market
    ) {
      return (
        <Box twClassName="space-y-4">
          {activePositions.map((position) => (
            <PredictPositionDetail
              key={position.id}
              position={position}
              market={market}
              marketStatus={market?.status as PredictMarketStatus}
            />
          ))}
          {claimablePositions.map((position) => (
            <PredictPositionDetail
              key={position.id}
              position={position}
              market={market}
              marketStatus={PredictMarketStatus.CLOSED}
            />
          ))}
        </Box>
      );
    }

    return (
      <Box twClassName="space-y-4">
        <Text
          variant={TextVariant.BodyMd}
          twClassName="font-medium"
          color={TextColor.TextAlternative}
        >
          {strings('predict.market_details.no_positions_found')}
        </Text>
      </Box>
    );
  },
);

PredictMarketDetailsPositions.displayName = 'PredictMarketDetailsPositions';

export default PredictMarketDetailsPositions;
