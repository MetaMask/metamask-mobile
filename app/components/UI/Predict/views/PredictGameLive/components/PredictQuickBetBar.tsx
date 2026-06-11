import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MoneylineTeamTokens } from '../hooks/useGameLiveMarkets';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../../types';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictQuickBetBarProps {
  game: PredictMarketGame;
  moneyline: MoneylineTeamTokens;
  /** Away-team win probability percent (0-100) from live moneyline prices. */
  awayPct: number;
  /** Home-team win probability percent (0-100) from live moneyline prices. */
  homePct: number;
  onBetPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

/**
 * Persistent bottom bar with one-tap moneyline bets for each side
 * ("SAS 54% | NYK 46%"). Tapping a side opens the existing buy flow prefilled
 * for that outcome token.
 */
const PredictQuickBetBar: React.FC<PredictQuickBetBarProps> = ({
  game,
  moneyline,
  awayPct,
  homePct,
  onBetPress,
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const { outcome, awayToken, homeToken } = moneyline;

  const handleAwayPress = useCallback(() => {
    if (awayToken) onBetPress(outcome, awayToken);
  }, [awayToken, onBetPress, outcome]);

  const handleHomePress = useCallback(() => {
    if (homeToken) onBetPress(outcome, homeToken);
  }, [homeToken, onBetPress, outcome]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="px-4 pt-3 gap-3 border-t border-muted bg-default"
      style={tw.style({ paddingBottom: Math.max(insets.bottom, 12) })}
      testID={PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_BAR}
    >
      {awayToken && (
        <Pressable
          onPress={handleAwayPress}
          style={tw.style('flex-1 rounded-full py-3', {
            backgroundColor: game.awayTeam.color,
          })}
          testID={PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_AWAY}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="gap-1"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              twClassName="text-white"
            >
              {game.awayTeam.abbreviation} {awayPct}%
            </Text>
          </Box>
        </Pressable>
      )}
      {homeToken && (
        <Pressable
          onPress={handleHomePress}
          style={tw.style('flex-1 rounded-full py-3', {
            backgroundColor: game.homeTeam.color,
          })}
          testID={PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_HOME}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="gap-1"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              twClassName="text-white"
            >
              {game.homeTeam.abbreviation} {homePct}%
            </Text>
          </Box>
        </Pressable>
      )}
    </Box>
  );
};

export default memo(PredictQuickBetBar);
