import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import I18n from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { useTheme } from '../../../../../util/theme';
import { isDrawCapableLeague } from '../../constants/sports';
import { PredictEventValues } from '../../constants/eventNames';
import { getLeagueConfig } from '../../constants/sportLeagueConfigs';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';
import { usePredictEntryPoint, usePredictPreviewSheet } from '../../contexts';
import {
  PredictMarket as PredictMarketType,
  PredictMarketGame,
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
  PredictSportTeam,
} from '../../types';
import {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import { parseScore } from '../../utils/gameParser';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import PredictSportTeamLogo from '../PredictSportTeamLogo/PredictSportTeamLogo';

const TEAM_LOGO_SIZE = 32;

interface PredictMarketSportCardProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  onDismiss?: () => void;
  isCarousel?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: (marketId: string) => void;
}

interface SportOutcomeButtonItem {
  key: string;
  label: string;
  token: PredictOutcomeToken;
  outcome: PredictOutcome;
  teamColor?: string;
  variant: 'home' | 'draw' | 'away';
}

const formatGameDateTime = (
  startTime: string,
): { date: string; time: string } => {
  const dateObj = new Date(startTime);
  const dateFormatter = getIntlDateTimeFormatter(I18n.locale, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatter = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    date: dateFormatter.format(dateObj),
    time: timeFormatter.format(dateObj),
  };
};

const formatCents = (price: number): string => `${Math.round(price * 100)}¢`;

const getTeamButtonLabel = (team: PredictSportTeam): string =>
  (team.abbreviation || team.alias || team.name).toUpperCase();

const matchesTeam = (
  tokenTitle: string | undefined,
  team: PredictSportTeam,
): boolean => {
  if (!tokenTitle) return false;
  const lower = tokenTitle.toLowerCase();
  return [team.name, team.alias, team.abbreviation]
    .filter(Boolean)
    .some((value) => lower === value?.toLowerCase());
};

const compactButtonItems = (
  items: (SportOutcomeButtonItem | undefined)[],
): SportOutcomeButtonItem[] =>
  items.filter((item): item is SportOutcomeButtonItem => Boolean(item));

const buildButtonItems = (
  market: PredictMarketType,
  game: PredictMarketGame,
  showDraw: boolean,
): SportOutcomeButtonItem[] => {
  const sortedDrawOutcomes =
    showDraw && market.outcomes.length >= 3
      ? [...market.outcomes].sort(
          (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
        )
      : null;

  if (sortedDrawOutcomes) {
    const homeOutcome = sortedDrawOutcomes[0];
    const drawOutcome = sortedDrawOutcomes[1];
    const awayOutcome = sortedDrawOutcomes[2];
    const homeToken = homeOutcome?.tokens[0];
    const drawToken = drawOutcome?.tokens[0];
    const awayToken = awayOutcome?.tokens[0];

    return compactButtonItems([
      homeToken
        ? {
            key: homeToken.id,
            label: getTeamButtonLabel(game.homeTeam),
            token: homeToken,
            outcome: homeOutcome,
            teamColor: game.homeTeam.color,
            variant: 'home',
          }
        : undefined,
      drawToken
        ? {
            key: drawToken.id,
            label: 'Draw',
            token: drawToken,
            outcome: drawOutcome,
            variant: 'draw',
          }
        : undefined,
      awayToken
        ? {
            key: awayToken.id,
            label: getTeamButtonLabel(game.awayTeam),
            token: awayToken,
            outcome: awayOutcome,
            teamColor: game.awayTeam.color,
            variant: 'away',
          }
        : undefined,
    ]);
  }

  const outcome = market.outcomes[0];
  if (!outcome) return [];

  const homeToken =
    outcome.tokens.find((token) => matchesTeam(token.title, game.homeTeam)) ??
    outcome.tokens[0];
  const drawToken = showDraw
    ? outcome.tokens.find((token) => token.title?.toLowerCase() === 'draw')
    : undefined;
  const awayToken =
    outcome.tokens.find((token) => matchesTeam(token.title, game.awayTeam)) ??
    outcome.tokens.find(
      (token) => token.id !== homeToken?.id && token.id !== drawToken?.id,
    ) ??
    outcome.tokens[1];

  return compactButtonItems([
    homeToken
      ? {
          key: homeToken.id,
          label: getTeamButtonLabel(game.homeTeam),
          token: homeToken,
          outcome,
          teamColor: game.homeTeam.color,
          variant: 'home',
        }
      : undefined,
    drawToken
      ? {
          key: drawToken.id,
          label: 'Draw',
          token: drawToken,
          outcome,
          variant: 'draw',
        }
      : undefined,
    awayToken
      ? {
          key: awayToken.id,
          label: getTeamButtonLabel(game.awayTeam),
          token: awayToken,
          outcome,
          teamColor: game.awayTeam.color,
          variant: 'away',
        }
      : undefined,
  ]);
};

const PredictMarketSportCard: React.FC<PredictMarketSportCardProps> = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  onDismiss,
  isCarousel,
  onCardPress,
  onBuyButtonPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const contextEntryPoint = usePredictEntryPoint();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { openBuySheet } = usePredictPreviewSheet();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });

  const baseEntryPoint =
    contextEntryPoint ??
    propEntryPoint ??
    PredictEventValues.ENTRY_POINT.PREDICT_FEED;

  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : baseEntryPoint;

  const game = market.game as PredictMarketGame | undefined;
  const config = game ? getLeagueConfig(game.league) : undefined;
  const { gameUpdate } = useLiveGameUpdates(game?.id ?? null);

  const liveData = useMemo(() => {
    if (!game) {
      return null;
    }

    const liveScore = gameUpdate?.score
      ? parseScore(gameUpdate.score, game.league)
      : null;

    return {
      homeScore: liveScore?.home ?? game.score?.home ?? 0,
      awayScore: liveScore?.away ?? game.score?.away ?? 0,
      elapsed: gameUpdate?.elapsed ?? game.elapsed,
      status: gameUpdate?.status ?? game.status,
    };
  }, [game, gameUpdate]);

  const buttonItems = useMemo(
    () =>
      game
        ? buildButtonItems(market, game, isDrawCapableLeague(game.league))
        : [],
    [game, market],
  );

  const handleCardPress = useCallback(() => {
    onCardPress?.();
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint: resolvedEntryPoint,
        title: market.title,
        image: market.image,
      },
    });
  }, [market, navigation, onCardPress, resolvedEntryPoint]);

  const handleBuy = useCallback(
    (item: SportOutcomeButtonItem) => {
      onBuyButtonPress?.(market.id);
      executeGuardedAction(
        () => {
          openBuySheet({
            market,
            outcome: item.outcome,
            outcomeToken: item.token,
            entryPoint: resolvedEntryPoint,
          });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [
      executeGuardedAction,
      market,
      onBuyButtonPress,
      openBuySheet,
      resolvedEntryPoint,
    ],
  );

  const renderTeamLogo = (team: PredictSportTeam, logoTestID?: string) =>
    config?.TeamIcon ? (
      <config.TeamIcon
        color={team.color}
        size={TEAM_LOGO_SIZE}
        testID={logoTestID}
      />
    ) : (
      <PredictSportTeamLogo
        uri={team.logo}
        size={TEAM_LOGO_SIZE}
        testID={logoTestID}
      />
    );

  const isLive = liveData?.status === 'ongoing';
  const isScheduled = liveData?.status === 'scheduled';
  const scheduledTime = game ? formatGameDateTime(game.startTime) : null;
  const showBuyButtons =
    market.status === PredictMarketStatus.OPEN &&
    liveData?.status !== 'ended' &&
    buttonItems.length > 0;

  const getButtonTextColorClass = (item: SportOutcomeButtonItem): string => {
    if (item.teamColor) return 'text-white';
    if (item.variant === 'home') return 'text-success-default';
    if (item.variant === 'away') return 'text-error-default';
    return 'text-default';
  };

  const getButtonBackgroundColor = (item: SportOutcomeButtonItem): string => {
    if (item.teamColor) return item.teamColor;
    if (item.variant === 'home') return colors.success.muted;
    if (item.variant === 'away') return colors.error.muted;
    return colors.background.muted;
  };

  if (!game || !liveData) {
    return null;
  }

  return (
    <TouchableOpacity
      style={tw.style(isCarousel ? '' : 'my-[8px]')}
      testID={testID}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Box twClassName="bg-muted rounded-[12px] overflow-hidden">
        {onDismiss && (
          <Box twClassName="absolute top-3 right-3 z-10">
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Md}
              iconProps={{ color: IconColor.IconDefault }}
              onPress={onDismiss}
              testID={testID ? `${testID}-close-button` : undefined}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </Box>
        )}

        <Box twClassName="p-4 gap-4">
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
            twClassName="text-center"
            numberOfLines={2}
          >
            {market.title}
          </Text>

          <Box twClassName="gap-2">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="w-full gap-3"
            >
              {renderTeamLogo(
                game.homeTeam,
                testID ? `${testID}-home-team-logo` : undefined,
              )}

              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
                twClassName={isScheduled ? 'opacity-0 w-16' : 'w-16'}
                numberOfLines={1}
              >
                {liveData.homeScore}
              </Text>

              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="flex-1"
              >
                {isLive ? (
                  <>
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Center}
                      twClassName="gap-1"
                    >
                      <Box
                        twClassName="w-[6px] h-[6px] rounded-full bg-success-default"
                        style={{ shadowColor: colors.success.default }}
                      />
                      <Text
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Medium}
                        color={TextColor.SuccessDefault}
                      >
                        Live
                      </Text>
                    </Box>
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                    >
                      {liveData.elapsed ?? ''}
                    </Text>
                  </>
                ) : scheduledTime ? (
                  <>
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextDefault}
                      twClassName="text-center"
                    >
                      {scheduledTime.date}
                    </Text>
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                      twClassName="text-center"
                    >
                      {scheduledTime.time}
                    </Text>
                  </>
                ) : null}
              </Box>

              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
                twClassName={
                  isScheduled ? 'opacity-0 w-16 text-right' : 'w-16 text-right'
                }
                numberOfLines={1}
              >
                {liveData.awayScore}
              </Text>

              {renderTeamLogo(
                game.awayTeam,
                testID ? `${testID}-away-team-logo` : undefined,
              )}
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              twClassName="w-full"
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                twClassName="flex-1"
              >
                {game.homeTeam.name}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                twClassName="flex-1 text-right"
              >
                {game.awayTeam.name}
              </Text>
            </Box>
          </Box>

          {showBuyButtons && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="w-full gap-2"
            >
              {buttonItems.map((item) => (
                <Box key={item.key} twClassName="flex-1">
                  <Button
                    onPress={() => handleBuy(item)}
                    style={{ backgroundColor: getButtonBackgroundColor(item) }}
                    isFullWidth
                    size={ButtonBaseSize.Lg}
                    testID={
                      testID ? `${testID}-${item.variant}-button` : undefined
                    }
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      numberOfLines={1}
                      style={tw.style(
                        'font-medium text-center',
                        getButtonTextColorClass(item),
                      )}
                    >
                      {item.label.toUpperCase()} {formatCents(item.token.price)}
                    </Text>
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default PredictMarketSportCard;
