import React, { useCallback, useMemo } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import I18n, { strings } from '../../../../../../locales/i18n';
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
import {
  formatVolume,
  formatPrice,
  formatPercentage,
} from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictNavigation } from '../../hooks/usePredictNavigation';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';
import { isDrawCapableLeague } from '../../constants/sports';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import PredictSportTeamLogo from '../PredictSportTeamLogo/PredictSportTeamLogo';
import { getLeagueConfig } from '../../constants/sportLeagueConfigs';

const LEAGUE_LOGO_SIZE = 15;
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';
import cardStyleSheet from './FeaturedCarouselCard.styles';
import {
  BET_AMOUNT,
  calculateRemainingOptions,
  calculateTotalVolume,
  getPayoutDisplay,
} from './FeaturedCarouselCard.utils';

const TEAM_LOGO_SIZE = 32;

const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  ucl: 'UCL',
};

const LEAGUE_TOTAL_MINUTES: Record<string, number> = {
  nba: 48,
  nfl: 60,
  ucl: 90,
};

const getTimeRemaining = (
  game: PredictMarketGame,
  elapsed?: string | null,
): string | null => {
  const elapsedStr = elapsed ?? game.elapsed;
  if (!elapsedStr || game.status !== 'ongoing') return null;
  const elapsedMins = parseInt(elapsedStr.replace(/[^0-9]/g, ''), 10);
  if (isNaN(elapsedMins)) return null;
  const totalMins = LEAGUE_TOTAL_MINUTES[game.league] ?? 90;
  const remaining = Math.max(0, totalMins - elapsedMins);
  return `${remaining} mins`;
};

const formatScheduledTime = (startTime: string): string => {
  const dateObj = new Date(startTime);
  const formatter = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return formatter.format(dateObj);
};

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
  const { navigateToBuyPreview } = usePredictNavigation();
  const { styles } = useStyles(cardStyleSheet, {});
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
  const timeRemaining = getTimeRemaining(game, liveData.elapsed);
  const scheduledTime = isScheduled
    ? formatScheduledTime(game.startTime)
    : null;
  const footerTimeText = timeRemaining ?? scheduledTime;

  const outcome = market.outcomes[0];
  const homeToken =
    outcome?.tokens?.find(
      (t) =>
        t.title.toLowerCase() === game.homeTeam.name.toLowerCase() ||
        t.title.toLowerCase() === game.homeTeam.alias.toLowerCase(),
    ) ?? outcome?.tokens?.[0];
  const awayToken =
    outcome?.tokens?.find(
      (t) =>
        t.title.toLowerCase() === game.awayTeam.name.toLowerCase() ||
        t.title.toLowerCase() === game.awayTeam.alias.toLowerCase(),
    ) ?? outcome?.tokens?.[1];
  const drawToken = showDraw
    ? outcome?.tokens?.find((t) => t.title.toLowerCase() === 'draw')
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
          navigateToBuyPreview(
            { market, outcome, outcomeToken: token, entryPoint },
            { throughRoot: true },
          );
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [market, outcome, entryPoint, executeGuardedAction, navigateToBuyPreview],
  );

  const visibleButtons = drawToken ? 3 : 2;
  const totalVolume = calculateTotalVolume(market.outcomes);
  const remainingOptions = calculateRemainingOptions(
    market.outcomes,
    visibleButtons,
  );

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
      <Box style={styles.cardContainer}>
        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="mb-3 gap-2"
          >
            {config.leagueLogo && (
              <Image
                source={{ uri: config.leagueLogo }}
                style={tw.style({
                  width: LEAGUE_LOGO_SIZE,
                  height: LEAGUE_LOGO_SIZE * 0.8,
                })}
                resizeMode="contain"
              />
            )}
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
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="mt-0.5 gap-1"
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {formatPrice(BET_AMOUNT)} {String.fromCharCode(0x2192)}
                  </Text>
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.SuccessDefault}
                    fontWeight={FontWeight.Medium}
                  >
                    {getPayoutDisplay(homeToken.price)}
                  </Text>
                </Box>
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
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="mt-0.5 gap-1"
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {formatPrice(BET_AMOUNT)} {String.fromCharCode(0x2192)}
                  </Text>
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.SuccessDefault}
                    fontWeight={FontWeight.Medium}
                  >
                    {getPayoutDisplay(awayToken.price)}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>

          <Box flexDirection={BoxFlexDirection.Row} twClassName="mt-3 gap-2">
            {homeToken && (
              <Box twClassName="flex-1">
                <Button
                  onPress={() => handleBuy(homeToken)}
                  style={{
                    backgroundColor: styles.buyButton.backgroundColor,
                  }}
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
                  style={{
                    backgroundColor: styles.buyButton.backgroundColor,
                  }}
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

        <Box
          testID={FEATURED_CAROUSEL_TEST_IDS.CARD_FOOTER(index)}
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
          twClassName="mt-4"
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {remainingOptions > 0 &&
              `+ ${remainingOptions} ${strings(
                remainingOptions === 1
                  ? 'predict.outcomes_singular'
                  : 'predict.outcomes_plural',
              )}`}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            {footerTimeText && (
              <>
                <Icon
                  name={IconName.Clock}
                  size={IconSize.Xs}
                  color={IconColor.IconAlternative}
                />
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                >
                  {footerTimeText}
                </Text>
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  ·
                </Text>
              </>
            )}
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              ${formatVolume(totalVolume)}{' '}
              {strings('predict.volume_abbreviated')}
            </Text>
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default FeaturedCarouselSportCard;
