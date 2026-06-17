import React, { memo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { OutcomesContent } from './PredictGameOutcomeCards';
import { usePricedOutcomeGroup } from './usePricedOutcomeGroup';

export { getSportsMarketTypeLabel } from './utils';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const PredictGameOutcomesTab = memo(
  ({ groupMap, game, activeChipKey, onBuyPress }: OutcomesTabProps) => {
    const selectedGroup = groupMap.get(activeChipKey);
    const pricedGroup = usePricedOutcomeGroup(selectedGroup);

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {pricedGroup && (
          <Box twClassName="px-4">
            <OutcomesContent
              group={pricedGroup}
              onBuyPress={onBuyPress}
              game={game}
            />
          </Box>
        )}
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
