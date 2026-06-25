import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PredictCryptoUpDownPositionsSelectorsIDs } from '../../Predict.testIds';
import {
  type PredictMarket,
  type PredictMarketStatus,
  type PredictPosition,
} from '../../types';
import PredictCryptoUpDownPosition from './PredictCryptoUpDownPosition';

export interface PredictCryptoUpDownPositionRow {
  position: PredictPosition;
  market: PredictMarket;
  marketStatus: PredictMarketStatus;
}

export interface PredictCryptoUpDownPositionsProps {
  rows: PredictCryptoUpDownPositionRow[];
}

const PredictCryptoUpDownPositions: React.FC<
  PredictCryptoUpDownPositionsProps
> = ({ rows }) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Box
      twClassName="px-4 gap-2"
      testID={PredictCryptoUpDownPositionsSelectorsIDs.SECTION}
    >
      <Text
        variant={TextVariant.HeadingSm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        testID={PredictCryptoUpDownPositionsSelectorsIDs.SECTION_HEADER}
      >
        {strings('predict.your_positions')}
      </Text>
      <Box
        twClassName="w-full"
        testID={PredictCryptoUpDownPositionsSelectorsIDs.LIST}
      >
        {rows.map(({ position, market, marketStatus }) => (
          <PredictCryptoUpDownPosition
            key={position.id}
            position={position}
            market={market}
            marketStatus={marketStatus}
          />
        ))}
      </Box>
    </Box>
  );
};

PredictCryptoUpDownPositions.displayName = 'PredictCryptoUpDownPositions';

export default PredictCryptoUpDownPositions;
