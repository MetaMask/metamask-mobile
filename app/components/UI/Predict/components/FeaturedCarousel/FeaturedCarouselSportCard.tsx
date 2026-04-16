import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PredictMarket,
  PredictMarketGame,
  PredictOutcomeToken,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { formatPercentage } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictPreviewSheet } from '../../contexts';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';
import { isDrawCapableLeague } from '../../constants/sports';
import PredictSportTeamLogo from '../PredictSportTeamLogo/PredictSportTeamLogo';
import { getLeagueConfig } from '../../constants/sportLeagueConfigs';
import FeaturedCarouselCardFooter from './FeaturedCarouselCardFooter';
import FeaturedCarouselPayoutRow from './FeaturedCarouselPayoutRow';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';
import {
  calculateTotalVolume,
  getTimeRemaining,
  formatScheduledTime,
  LEAGUE_DISPLAY_NAMES,
} from './FeaturedCarouselCard.utils';

const TEAM_LOGO_SIZE = 32;

interface FeaturedCarouselSportCardProps {
  market: PredictMarket;
  index: number;
  entryPoint?: PredictEntryPoint;
}

const FeaturedCarouselSportCard: React.FC<FeaturedCarouselSportCardProps> = ({
  market,
  index,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { openBuySheet } = usePredictPreviewSheet();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });

  const game = market.game as PredictMarketGame;
  const config = getLeagueConfig(game.league);
  const { gameUpdate } = useLiveGameUpdates(game.id);
  const showDraw = isDrawCapableLeague(game.league);

  const liveData = useMemo(() => {
    const parseScore = (raw: string | null | undefined) => {
      if (!raw) return null;
      const [away, home] = raw.split('-').map(Number);
      return !isNaN(away) && !isNaN(home) ? { away, home } : null;
    };
    const liveScore = gameUpdate?.score ? parseScore(gameUpdate.score) : null;
    return {
      homeScore: liveScore?.home ?? game.score?.home ?? 0,
      awayScore: liveScore?.away ?? game.score?.away ?? 0,
      elapsed: gameUpdate?.elapsed ?? game.elapsed,
      status: gameUpdate?.status ?? game.status,
    };
  }, [game, gameUpdate]);

  const isLive = liveData.status === 'ongoing';
  const isScheduled = liveData.status === 'scheduled';
  const leagueName =
    LEAGUE_DISPLAY_NAMES[game.league] ?? game.league.toUpperCase();
  const liveText = isLive ? (liveData.elapsed ?? '') : '';
  const timeRemaining = getTimeRemaining(
    game,
    liveData.elapsed,
    liveData.status,
  );
  const scheduledTime = isScheduled
    ? formatScheduledTime(game.startTime)
    : null;
  const footerTimeText = timeRemaining ?? scheduledTime;

  const outcome = market.outcomes[0];
  const matchesTeam = (
    tokenTitle: string | undefined,
    team: { name?: string; alias?: string },
  ) => {
    if (!tokenTitle) return false;
    const lower = tokenTitle.toLowerCase();
    return (
      lower === team.name?.toLowerCase() ||
      (team.alias != null && lower === team.alias.toLowerCase())
    );
  };

  const homeToken =
    outcome?.tokens?.find((t) => matchesTeam(t.title, game.homeTeam)) ??
    outcome?.tokens?.[0];
  const awayToken =
    outcome?.tokens?.find((t) => matchesTeam(t.title, game.awayTeam)) ??
    outcome?.tokens?.[1];
  const drawToken = showDraw
    ? outcome?.tokens?.find((t) => t.title?.toLowerCase() === 'draw')
    : undefined;

  const handleCardPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint,
        title: market.title,
        image: market.image,
      },
    });
  }, [market, entryPoint, navigation]);

  const handleBuy = useCallback(
    (token: PredictOutcomeToken) => {
      if (!outcome) return;
      executeGuardedAction(
        () => {
          openBuySheet({ market, outcome, outcomeToken: token, entryPoint });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [market, outcome, entryPoint, executeGuardedAction, openBuySheet],
  );

  const totalVolume = calculateTotalVolume(market.outcomes);
  const remainingOptions = Math.max(0, market.outcomes.length - 1);

  const renderTeamLogo = (team: typeof game.homeTeam, testID?: string) =>
    config.TeamIcon ? (
      <config.TeamIcon
        color={team.color}
        size={TEAM_LOGO_SIZE}
        testID={testID}
      />
    ) : (
      <PredictSportTeamLogo
        uri={team.logo}
        size={TEAM_LOGO_SIZE}
        testID={testID}
      />
    );

  return (
    <TouchableOpacity
      testID={FEATURED_CAROUSEL_TEST_IDS.CARD(index)}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Box twClassName="bg-section rounded-xl p-4 h-full justify-between">
        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="mb-3 gap-2"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {leagueName}
            </Text>
            {isLive && liveText ? (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  ·
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.ErrorDefault}
                >
                  Live {liveText}
                </Text>
              </>
            ) : scheduledTime ? (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  ·
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {scheduledTime}
                </Text>
              </>
            ) : null}
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mb-2"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              {renderTeamLogo(game.homeTeam)}
              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
              >
                {liveData.homeScore}
              </Text>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
              >
                {liveData.awayScore}
              </Text>
              {renderTeamLogo(game.awayTeam)}
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mb-1"
          >
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {game.homeTeam.name}
              </Text>
              {homeToken && (
                <FeaturedCarouselPayoutRow price={homeToken.price} />
              )}
            </Box>

            <Box twClassName="flex-1 items-end">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {game.awayTeam.name}
              </Text>
              {awayToken && (
                <FeaturedCarouselPayoutRow price={awayToken.price} />
              )}
            </Box>
          </Box>

          <Box flexDirection={BoxFlexDirection.Row} twClassName="mt-3 gap-2">
            {homeToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() => handleBuy(homeToken)}
                  twClassName="bg-success-muted"
                  isFullWidth
                  size={ButtonBaseSize.Lg}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={tw.style('font-medium')}
                    color={TextColor.SuccessDefault}
                  >
                    {formatPercentage(Math.round(homeToken.price * 100))}
                  </Text>
                </Button>
              </Box>
            )}
            {drawToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() => handleBuy(drawToken)}
                  isFullWidth
                  size={ButtonBaseSize.Lg}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={tw.style('font-medium')}
                    color={TextColor.TextDefault}
                  >
                    {strings('predict.outcome_draw')}
                  </Text>
                </Button>
              </Box>
            )}
            {awayToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() => handleBuy(awayToken)}
                  twClassName="bg-success-muted"
                  isFullWidth
                  size={ButtonBaseSize.Lg}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={tw.style('font-medium')}
                    color={TextColor.SuccessDefault}
                  >
                    {formatPercentage(Math.round(awayToken.price * 100))}
                  </Text>
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        <FeaturedCarouselCardFooter
          testID={FEATURED_CAROUSEL_TEST_IDS.CARD_FOOTER(index)}
          remainingOptions={remainingOptions}
          timeText={footerTimeText}
          totalVolume={totalVolume}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default FeaturedCarouselSportCard;
