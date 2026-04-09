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
import { Pressable, RefreshControl, ScrollView } from 'react-native';
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
import PredictMarketDetailsTabBar from '../../views/PredictMarketDetails/components/PredictMarketDetailsTabBar';
import PredictGameDetailsTabsContent from './PredictGameDetailsTabsContent';
import { useGameDetailsTabs } from './hooks/useGameDetailsTabs';
import { PredictGameDetailsContentProps } from './PredictGameDetailsContent.types';
import { useTheme } from '../../../../../util/theme';
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
  const { colors } = useTheme();
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
    claimable: false,
  });
  const { data: claimablePositions = [] } = usePredictPositions({
    marketId: market.id,
    claimable: true,
  });

  const {
    enabled: tabsEnabled,
    showTabBar,
    tabs,
    activeTab,
    handleTabPress,
    stickyHeaderIndices,
  } = useGameDetailsTabs({
    activePositions,
    claimablePositions,
    league: game?.league,
  });

  if (!outcome || !game) {
    return null;
  }

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

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('pb-4')}
        stickyHeaderIndices={stickyHeaderIndices}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.default}
            colors={[colors.primary.default]}
          />
        }
      >
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

        {showTabBar && (
          <PredictMarketDetailsTabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        )}

        <PredictGameDetailsTabsContent
          market={market}
          activeTab={activeTab}
          tabs={tabs}
          enabled={tabsEnabled}
          showTabBar={showTabBar}
          activePositions={activePositions}
          claimablePositions={claimablePositions}
        />
      </ScrollView>

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
