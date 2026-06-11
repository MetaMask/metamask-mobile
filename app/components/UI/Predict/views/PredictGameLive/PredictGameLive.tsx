import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  type NavigationProp,
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { TabsBar } from '../../../../../component-library/components-temp/Tabs';
import PredictChipList from '../../components/PredictChipList';
import PredictGameOutcomesTab from '../../components/PredictGameDetailsContent/PredictGameOutcomesTab';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictPreviewSheet } from '../../contexts';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { MOCK_LIVE_GAME_MARKET } from '../../mocks/mockLiveGame';
import { selectPredictGameLiveEnabledFlag } from '../../selectors/featureFlags';
import type { PredictOutcome, PredictOutcomeToken } from '../../types';
import type { PredictNavigationParamList } from '../../types/navigation';
import { getOutcomeGroupLabel } from '../../utils/outcomeGroupLabel';
import { isValidPrice } from '../../utils/prices';
import PredictGameLiveFeed from './components/PredictGameLiveFeed';
import PredictGameLiveHeader from './components/PredictGameLiveHeader';
import PredictQuickBetBar from './components/PredictQuickBetBar';
import { useGameEventFeed } from './hooks/useGameEventFeed';
import { useGameLiveMarkets } from './hooks/useGameLiveMarkets';
import { useMockGameUpdates } from './hooks/useMockGameUpdates';
import { PREDICT_GAME_LIVE_TEST_IDS } from './PredictGameLive.testIds';

const TAB_FEED = 0;
const TAB_MARKETS = 1;

/**
 * REAL-style live game screen: live score header, play-by-play feed with
 * inline betting widgets, and a persistent quick-bet bar — all wired to the
 * existing Polymarket buy flow. Play-by-play is simulated and anchored to
 * real score updates; bets are real.
 */
const PredictGameLive: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictGameLive'>>();
  const { marketId, mock = false } = route.params;

  const isEnabled = useSelector(selectPredictGameLiveEnabledFlag);

  const { data: fetchedMarket, isLoading } = usePredictMarket({
    id: marketId,
    enabled: isEnabled && !mock,
  });
  const market = mock ? MOCK_LIVE_GAME_MARKET : (fetchedMarket ?? undefined);
  const game = market?.game;

  const { gameUpdate: liveGameUpdate } = useLiveGameUpdates(
    !mock && game ? game.id : null,
  );
  const mockGameUpdate = useMockGameUpdates(mock);
  const gameUpdate = mock ? mockGameUpdate : liveGameUpdate;

  const { moneyline, feedMarkets, outcomeGroups } = useGameLiveMarkets(market);

  const { feedItems } = useGameEventFeed({
    game,
    gameUpdate,
    markets: feedMarkets,
    enabled: isEnabled && Boolean(game),
  });

  const moneylineTokenIds = useMemo(
    () =>
      [moneyline?.awayToken?.id, moneyline?.homeToken?.id].filter(
        (id): id is string => Boolean(id),
      ),
    [moneyline],
  );
  const { getPrice } = useLiveMarketPrices(moneylineTokenIds, {
    enabled: !mock,
  });

  const toWinPct = useCallback(
    (token: PredictOutcomeToken | undefined): number | undefined => {
      if (!token) return undefined;
      const liveBestAsk = getPrice(token.id)?.bestAsk;
      const price = isValidPrice(liveBestAsk) ? liveBestAsk : token.price;
      return isValidPrice(price) ? Math.round(price * 100) : undefined;
    },
    [getPrice],
  );
  const awayPct = toWinPct(moneyline?.awayToken);
  const homePct = toWinPct(moneyline?.homeToken);

  const { openBuySheet } = usePredictPreviewSheet();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });

  const handleBuyPress = useCallback(
    (outcome: PredictOutcome, token: PredictOutcomeToken) => {
      // Mock mode renders fake outcomes — never route them into the real
      // order flow.
      if (mock || !market) return;
      executeGuardedAction(
        () => {
          openBuySheet({
            market,
            outcome,
            outcomeToken: token,
            entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
            predictScreen: 'game_live',
          });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [executeGuardedAction, market, mock, openBuySheet],
  );

  const [activeTab, setActiveTab] = useState(TAB_FEED);
  const tabs = useMemo(
    () => [
      {
        key: 'feed',
        label: strings('predict.game_live.tab_feed'),
        content: null,
      },
      {
        key: 'markets',
        label: strings('predict.game_live.tab_markets'),
        content: null,
      },
    ],
    [],
  );

  const chips = useMemo(
    () =>
      outcomeGroups.map((group) => ({
        key: group.key,
        label: getOutcomeGroupLabel(group.key),
      })),
    [outcomeGroups],
  );
  const groupMap = useMemo(
    () => new Map(outcomeGroups.map((group) => [group.key, group])),
    [outcomeGroups],
  );
  const [activeChipKey, setActiveChipKey] = useState('');
  const resolvedChipKey = groupMap.has(activeChipKey)
    ? activeChipKey
    : (outcomeGroups[0]?.key ?? '');

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={tw.style({ paddingTop: insets.top })}
      testID={PREDICT_GAME_LIVE_TEST_IDS.SCREEN}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-2 py-1"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Lg}
          onPress={handleBack}
          testID={PREDICT_GAME_LIVE_TEST_IDS.BACK_BUTTON}
        />
        <Box twClassName="flex-1 items-center">
          {game && (
            <>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {game.league.toUpperCase()}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
              </Text>
            </>
          )}
        </Box>
        {/* Spacer to keep the title centered against the back button. */}
        <Box twClassName="w-10" />
      </Box>

      {isLoading && !market && (
        <Box twClassName="flex-1 items-center justify-center">
          <ActivityIndicator />
        </Box>
      )}

      {!isLoading && (!market || !game) && (
        <Box twClassName="flex-1 items-center justify-center px-4">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('predict.game_live.game_unavailable')}
          </Text>
        </Box>
      )}

      {market && game && (
        <>
          <PredictGameLiveHeader
            game={game}
            gameUpdate={gameUpdate}
            awayPct={awayPct}
            homePct={homePct}
          />

          <TabsBar
            tabs={tabs}
            activeIndex={activeTab}
            onTabPress={setActiveTab}
            testID={PREDICT_GAME_LIVE_TEST_IDS.TABS}
          />

          <Box twClassName="flex-1">
            {activeTab === TAB_FEED && (
              <PredictGameLiveFeed
                items={feedItems}
                game={game}
                onBuyPress={handleBuyPress}
              />
            )}
            {activeTab === TAB_MARKETS && (
              <ScrollView>
                <Box twClassName="py-2 gap-2">
                  {chips.length > 1 && (
                    <PredictChipList
                      chips={chips}
                      activeChipKey={resolvedChipKey}
                      onChipSelect={setActiveChipKey}
                    />
                  )}
                  <PredictGameOutcomesTab
                    groupMap={groupMap}
                    activeChipKey={resolvedChipKey}
                    game={game}
                    onBuyPress={handleBuyPress}
                  />
                </Box>
              </ScrollView>
            )}
          </Box>

          {moneyline && awayPct !== undefined && homePct !== undefined && (
            <PredictQuickBetBar
              game={game}
              moneyline={moneyline}
              awayPct={awayPct}
              homePct={homePct}
              onBetPress={handleBuyPress}
            />
          )}
        </>
      )}
    </Box>
  );
};

export default PredictGameLive;
