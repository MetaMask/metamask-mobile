import { Box } from '@metamask/design-system-react-native';
import React, { memo, useMemo } from 'react';
import PredictGameOutcomesTab from '../../../components/PredictGameDetailsContent/PredictGameOutcomesTab';
import type { GameLiveMarketKind } from '../../../services/gameEvents';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../../types';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictInlineMarketCardProps {
  marketKind: GameLiveMarketKind;
  outcomes: PredictOutcome[];
  game: PredictMarketGame;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

/** Maps feed market kinds to the provider's sportsMarketType keys. */
const MARKET_KIND_TO_TYPE_KEY: Record<GameLiveMarketKind, string> = {
  moneyline: 'moneyline',
  spread: 'spreads',
  total: 'totals',
};

/**
 * Real, tappable market widget woven into the live feed. Reuses the game
 * details outcomes renderer (moneyline buttons / line selector cards) by
 * presenting the outcomes as a single subgroup, so press handling and team
 * coloring stay identical to the Markets tab.
 */
const PredictInlineMarketCard: React.FC<PredictInlineMarketCardProps> = ({
  marketKind,
  outcomes,
  game,
  onBuyPress,
}) => {
  const typeKey = MARKET_KIND_TO_TYPE_KEY[marketKind];

  const groupMap = useMemo(() => {
    const group: PredictOutcomeGroup = {
      key: `inline-${marketKind}`,
      outcomes: [],
      subgroups: [{ key: typeKey, outcomes }],
    };
    return new Map([[group.key, group]]);
  }, [marketKind, typeKey, outcomes]);

  return (
    <Box
      twClassName="my-1"
      testID={PREDICT_GAME_LIVE_TEST_IDS.INLINE_MARKET_CARD}
    >
      <PredictGameOutcomesTab
        groupMap={groupMap}
        activeChipKey={`inline-${marketKind}`}
        game={game}
        onBuyPress={onBuyPress}
      />
    </Box>
  );
};

export default memo(PredictInlineMarketCard);
