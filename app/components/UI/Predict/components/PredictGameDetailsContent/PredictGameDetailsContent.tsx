import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { usePredictBottomSheet } from '../../hooks/usePredictBottomSheet';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import PredictGameChart from '../PredictGameChart';
import { PredictGameDetailsFooter } from '../PredictGameDetailsFooter';
import PredictGameAboutSheet from '../PredictGameDetailsFooter/PredictGameAboutSheet';
import PredictShareButton from '../PredictShareButton/PredictShareButton';
import PredictSportScoreboard from '../PredictSportScoreboard';
import PredictGameDetailsOutcomesList from './PredictGameDetailsOutcomesList';
import { useGameDetailsTabs } from '../../hooks/useGameDetailsTabs';
import { PredictGameDetailsContentProps } from './PredictGameDetailsContent.types';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';

const PredictGameDetailsContent: React.FC<PredictGameDetailsContentProps> = ({
  market,
  onBack,
  onRefresh,
  refreshing,
  onBetPress,
  onClaimPress,
  claimableAmount = 0,
  isLoading = false,
  isClaimPending = false,
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const { sheetRef, isVisible, handleSheetClosed, getRefHandlers } =
    usePredictBottomSheet();

  const sheetHandlers = useMemo(() => getRefHandlers(), [getRefHandlers]);

  const handleInfoPress = useCallback(() => {
    sheetHandlers.onOpenBottomSheet();
  }, [sheetHandlers]);

  const outcome = useMemo(() => market.outcomes[0], [market.outcomes]);
  const game = market.game;

  const { data: activePositions = [] } = usePredictPositions({
    marketId: market.id,
    childMarketIds: market.childMarketIds,
    claimable: false,
    livePriceUpdates: true,
  });
  const { data: claimablePositions = [] } = usePredictPositions({
    marketId: market.id,
    childMarketIds: market.childMarketIds,
    claimable: true,
  });

  const {
    enabled: tabsEnabled,
    showTabBar,
    tabs,
    activeTab,
    handleTabPress,
    chips,
    groupMap,
    activeChipKey,
    handleChipSelect,
    showChips,
  } = useGameDetailsTabs({
    activePositions,
    claimablePositions,
    league: game?.league,
    outcomeGroups: market.outcomeGroups ?? [],
  });

  const hasExtendedOutcomes = tabsEnabled && groupMap.size > 0;
  const showFooter =
    !hasExtendedOutcomes || (claimableAmount > 0 && Boolean(onClaimPress));
  if (!outcome || !game) {
    return null;
  }

  const outcomesListHeader = (
    <>
      <Box twClassName="px-4 py-2">
        <PredictSportScoreboard
          game={game}
          testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_SCOREBOARD}
        />
      </Box>

      <Box twClassName="mt-4">
        <PredictGameChart
          market={market}
          testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_CHART}
        />
      </Box>
    </>
  );

  return (
    <SafeAreaView
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right']}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={strings('predict.buttons.back')}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
        </Pressable>

        <Box twClassName="flex-1 mx-4">
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('text-center')}
            numberOfLines={1}
          >
            {market.title}
          </Text>
        </Box>

        <PredictShareButton marketId={market.id} marketSlug={market.slug} />
      </Box>

      <PredictGameDetailsOutcomesList
        market={market}
        enabled={tabsEnabled}
        groupMap={groupMap}
        activeChipKey={activeChipKey}
        onBetPress={onBetPress}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showTabBar={showTabBar}
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        showChips={showChips}
        chips={chips}
        onChipSelect={handleChipSelect}
        activePositions={activePositions}
        claimablePositions={claimablePositions}
        listHeaderComponent={outcomesListHeader}
      />

      {showFooter && (
        <PredictGameDetailsFooter
          market={market}
          outcome={outcome}
          onBetPress={onBetPress}
          onClaimPress={onClaimPress}
          onInfoPress={handleInfoPress}
          claimableAmount={claimableAmount}
          isLoading={isLoading}
          isClaimPending={isClaimPending}
        />
      )}

      {isVisible && (
        <PredictGameAboutSheet
          ref={sheetRef}
          description={market.description ?? ''}
          onClose={handleSheetClosed}
        />
      )}
    </SafeAreaView>
  );
};

export default PredictGameDetailsContent;
