import {
  Box,
  BoxFlexDirection,
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
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { isDrawCapableLeague } from '../../constants/sports';
import { resolvePredictSportCardButtons } from '../../utils/sports';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { usePredictGame } from '../../hooks/usePredictGame';
import { usePredictPreviewSheet } from '../../contexts';
import { useResolvedPredictEntryPoint } from '../../hooks/useResolvedPredictEntryPoint';
import {
  PredictMarket as PredictMarketType,
  PredictMarketGame,
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
  PredictSportTeam,
  type PredictMarketBuyButtonPress,
} from '../../types';
import {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import PredictSportScoreboard from '../PredictSportScoreboard';
import { isGameEnded } from '../../utils/scoreboard';
import { isValidPrice } from '../../utils/prices';
import { selectPredictSportCardLivePricesEnabledFlag } from '../../selectors/featureFlags';

interface PredictMarketSportCardProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  onDismiss?: () => void;
  isCarousel?: boolean;
  cardPressDisabled?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: PredictMarketBuyButtonPress;
  predictFeedTab?: string;
  predictScreen?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

interface SportOutcomeButtonItem {
  key: string;
  label: string;
  token: PredictOutcomeToken;
  outcome: PredictOutcome;
  teamColor?: string;
  variant: 'home' | 'draw' | 'away';
}

const formatCents = (price: number): string => `${Math.round(price * 100)}¢`;

const getTeamButtonLabel = (team: PredictSportTeam): string =>
  (team.abbreviation || team.alias || team.name).toUpperCase();

const compactButtonItems = (
  items: (SportOutcomeButtonItem | undefined)[],
): SportOutcomeButtonItem[] =>
  items.filter((item): item is SportOutcomeButtonItem => Boolean(item));

const buildButtonItems = (
  market: PredictMarketType,
  game: PredictMarketGame,
  showDraw: boolean,
): SportOutcomeButtonItem[] => {
  const { home, draw, away } = resolvePredictSportCardButtons({
    outcomes: market.outcomes,
    game,
    showDraw,
  });

  return compactButtonItems([
    home
      ? {
          key: home.token.id,
          label: getTeamButtonLabel(game.homeTeam),
          token: home.token,
          outcome: home.outcome,
          teamColor: game.homeTeam.color,
          variant: 'home',
        }
      : undefined,
    draw
      ? {
          key: draw.token.id,
          label: 'Draw',
          token: draw.token,
          outcome: draw.outcome,
          variant: 'draw',
        }
      : undefined,
    away
      ? {
          key: away.token.id,
          label: getTeamButtonLabel(game.awayTeam),
          token: away.token,
          outcome: away.outcome,
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
  cardPressDisabled,
  onCardPress,
  onBuyButtonPress,
  predictFeedTab,
  predictScreen,
  transactionActiveAbTests,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const resolvedEntryPoint = useResolvedPredictEntryPoint(propEntryPoint);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { openBuySheet } = usePredictPreviewSheet();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const livePricesEnabled = useSelector(
    selectPredictSportCardLivePricesEnabledFlag,
  );

  const { game } = usePredictGame(market, { live: true });
  // Mirror the canonical "game over" definition (terminal status, a full-time
  // period, or a stamped endTime) so buy buttons disappear exactly when the
  // scoreboard reads "Final" and the market becomes eligible for hiding.
  const gameEnded = isGameEnded({
    status: game?.status,
    period: game?.period,
    endTime: game?.endTime,
  });

  const buttonItems = useMemo(
    () =>
      game
        ? buildButtonItems(market, game, isDrawCapableLeague(game.league))
        : [],
    [game, market],
  );

  const handleCardPress = useCallback(() => {
    if (cardPressDisabled) {
      return;
    }

    onCardPress?.();
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint: resolvedEntryPoint,
        ...(predictFeedTab && { predictFeedTab }),
        ...(predictScreen && { predictScreen }),
        title: market.title,
        image: market.image,
        ...(transactionActiveAbTests?.length && {
          transactionActiveAbTests,
        }),
      },
    });
  }, [
    market,
    cardPressDisabled,
    navigation,
    onCardPress,
    predictFeedTab,
    predictScreen,
    resolvedEntryPoint,
    transactionActiveAbTests,
  ]);

  const handleBuy = useCallback(
    (item: SportOutcomeButtonItem) => {
      const handledExternally =
        onBuyButtonPress?.({
          market,
          outcome: item.outcome,
          outcomeToken: item.token,
        }) === true;
      if (handledExternally) {
        return;
      }

      executeGuardedAction(
        () => {
          openBuySheet({
            market,
            outcome: item.outcome,
            outcomeToken: item.token,
            entryPoint: resolvedEntryPoint,
            ...(predictFeedTab && { predictFeedTab }),
            ...(predictScreen && { predictScreen }),
            ...(transactionActiveAbTests?.length && {
              transactionActiveAbTests,
            }),
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
      predictFeedTab,
      predictScreen,
      resolvedEntryPoint,
      transactionActiveAbTests,
    ],
  );

  const isCompact = Boolean(isCarousel);

  const showBuyButtons =
    market.status === PredictMarketStatus.OPEN &&
    !gameEnded &&
    buttonItems.length > 0;
  const tokenIds = useMemo(
    () => buttonItems.map((item) => item.token.id),
    [buttonItems],
  );
  const { getPrice } = useLiveMarketPrices(tokenIds, {
    enabled: showBuyButtons && livePricesEnabled,
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

  if (!game) {
    return null;
  }

  return (
    <TouchableOpacity
      style={tw.style(isCarousel ? '' : 'my-[8px]')}
      testID={testID}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Box
        twClassName={`bg-muted rounded-[12px] overflow-hidden ${isCompact ? 'h-full' : ''}`}
      >
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

        <Box
          twClassName={isCompact ? 'flex-1 p-3 justify-between' : 'p-4 gap-4'}
        >
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
            twClassName="text-center"
            numberOfLines={isCompact ? 1 : 2}
          >
            {market.title}
          </Text>

          <PredictSportScoreboard
            game={game}
            compact={isCompact}
            testID={testID ? `${testID}-scoreboard` : undefined}
          />

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
                    twClassName={isCompact ? 'p-0' : 'px-1'}
                    contentWrapperProps={{ twClassName: 'w-full' }}
                    isFullWidth
                    size={isCompact ? ButtonBaseSize.Md : ButtonBaseSize.Lg}
                    testID={
                      testID ? `${testID}-${item.variant}-button` : undefined
                    }
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      ellipsizeMode="clip"
                      style={tw.style(
                        'font-medium text-center flex-1',
                        getButtonTextColorClass(item),
                      )}
                    >
                      {item.label.toUpperCase()}{' '}
                      {formatCents(getDisplayPrice(item.token))}
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
