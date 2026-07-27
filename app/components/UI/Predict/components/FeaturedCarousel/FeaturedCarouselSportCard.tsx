import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
  PredictSportTeam,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { formatPercentage } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictPreviewSheet } from '../../contexts';
import { usePredictGame } from '../../hooks/usePredictGame';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { isDrawCapableLeague } from '../../constants/sports';
import { resolvePredictSportCardButtons } from '../../utils/sports';
import { selectPredictSportCardLivePricesEnabledFlag } from '../../selectors/featureFlags';
import PredictSportTeamLogo from '../PredictSportTeamLogo/PredictSportTeamLogo';
import { getLeagueConfig } from '../../constants/sportLeagueConfigs';
import { isValidPrice } from '../../utils/prices';
import { getLeagueTeamOrder } from '../../utils/gameParser';
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
  const livePricesEnabled = useSelector(
    selectPredictSportCardLivePricesEnabledFlag,
  );

  const { game: predictGame } = usePredictGame(market, { live: true });
  const game = predictGame as PredictMarketGame;
  const config = getLeagueConfig(game.league);
  const showDraw = isDrawCapableLeague(game.league);

  const liveData = useMemo(
    () => ({
      homeScore: game.score?.home ?? 0,
      awayScore: game.score?.away ?? 0,
      elapsed: game.elapsed,
      status: game.status,
    }),
    [game],
  );

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

  const buttonResolution = useMemo(
    () =>
      resolvePredictSportCardButtons({
        outcomes: market.outcomes,
        game,
        showDraw,
      }),
    [game, market.outcomes, showDraw],
  );
  const drawToken = buttonResolution.draw?.token;
  const isHomeFirst = getLeagueTeamOrder(game.league) === 'home-away';
  const leftTeam = isHomeFirst ? game.homeTeam : game.awayTeam;
  const rightTeam = isHomeFirst ? game.awayTeam : game.homeTeam;
  const leftScore = isHomeFirst ? liveData.homeScore : liveData.awayScore;
  const rightScore = isHomeFirst ? liveData.awayScore : liveData.homeScore;
  const leftButtonResolution = isHomeFirst
    ? buttonResolution.home
    : buttonResolution.away;
  const rightButtonResolution = isHomeFirst
    ? buttonResolution.away
    : buttonResolution.home;
  const leftToken = leftButtonResolution?.token;
  const rightToken = rightButtonResolution?.token;
  const tokenIds = useMemo(
    () =>
      [leftToken, drawToken, rightToken]
        .map((token) => token?.id)
        .filter((id): id is string => Boolean(id)),
    [drawToken, leftToken, rightToken],
  );

  const { getPrice } = useLiveMarketPrices(tokenIds, {
    enabled:
      livePricesEnabled &&
      market.status === PredictMarketStatus.OPEN &&
      tokenIds.length > 0,
  });

  const getDisplayPrice = useCallback(
    (token: PredictOutcomeToken): number => {
      if (!livePricesEnabled) {
        return token.price;
      }

      const liveBestAsk = getPrice(token.id)?.bestAsk;
      return isValidPrice(liveBestAsk) ? liveBestAsk : token.price;
    },
    [getPrice, livePricesEnabled],
  );

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
    (token: PredictOutcomeToken, selectedOutcome?: PredictOutcome) => {
      if (!selectedOutcome) return;
      executeGuardedAction(
        () => {
          openBuySheet({
            market,
            outcome: selectedOutcome,
            outcomeToken: token,
            entryPoint,
          });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [market, entryPoint, executeGuardedAction, openBuySheet],
  );

  const totalVolume = calculateTotalVolume(market.outcomes);
  const remainingOptions = buttonResolution.remainingOptions;

  const renderTeamLogo = (team: PredictSportTeam, testID?: string) =>
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
              {renderTeamLogo(leftTeam)}
              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
              >
                {leftScore}
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
                {rightScore}
              </Text>
              {renderTeamLogo(rightTeam)}
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
                testID={FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(index, 0)}
              >
                {leftTeam.name}
              </Text>
              {leftToken && (
                <FeaturedCarouselPayoutRow price={getDisplayPrice(leftToken)} />
              )}
            </Box>

            <Box twClassName="flex-1 items-end">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
                testID={FEATURED_CAROUSEL_TEST_IDS.CARD_OUTCOME(
                  index,
                  drawToken ? 2 : 1,
                )}
              >
                {rightTeam.name}
              </Text>
              {rightToken && (
                <FeaturedCarouselPayoutRow
                  price={getDisplayPrice(rightToken)}
                />
              )}
            </Box>
          </Box>

          <Box flexDirection={BoxFlexDirection.Row} twClassName="mt-3 gap-2">
            {leftToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() =>
                    handleBuy(leftToken, leftButtonResolution?.outcome)
                  }
                  twClassName="bg-success-muted"
                  isFullWidth
                  size={ButtonBaseSize.Lg}
                  testID={FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(index, 0)}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={tw.style('font-medium')}
                    color={TextColor.SuccessDefault}
                  >
                    {formatPercentage(
                      Math.round(getDisplayPrice(leftToken) * 100),
                    )}
                  </Text>
                </Button>
              </Box>
            )}
            {drawToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() =>
                    handleBuy(drawToken, buttonResolution.draw?.outcome)
                  }
                  isFullWidth
                  size={ButtonBaseSize.Lg}
                  testID={FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(index, 1)}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={tw.style('font-medium')}
                    color={TextColor.TextDefault}
                  >
                    {strings('predict.outcome_draw')}{' '}
                    {formatPercentage(
                      Math.round(getDisplayPrice(drawToken) * 100),
                    )}
                  </Text>
                </Button>
              </Box>
            )}
            {rightToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() =>
                    handleBuy(rightToken, rightButtonResolution?.outcome)
                  }
                  twClassName="bg-success-muted"
                  isFullWidth
                  size={ButtonBaseSize.Lg}
                  testID={FEATURED_CAROUSEL_TEST_IDS.CARD_BUY_BUTTON(
                    index,
                    drawToken ? 2 : 1,
                  )}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={tw.style('font-medium')}
                    color={TextColor.SuccessDefault}
                  >
                    {formatPercentage(
                      Math.round(getDisplayPrice(rightToken) * 100),
                    )}
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
