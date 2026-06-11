import React, { memo, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RefreshControl, ScrollView } from 'react-native';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import type {
  PredictMarket,
  PredictMarketGame,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictPosition,
} from '../../types';
import { useTheme } from '../../../../../util/theme';
import PredictChipList from '../PredictChipList';
import PredictMarketDetailsTabBar from '../../views/PredictMarketDetails/components/PredictMarketDetailsTabBar';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictGameDetailsTabsContent from './PredictGameDetailsTabsContent';

interface PredictGameDetailsOutcomesListProps {
  market: PredictMarket;
  enabled: boolean;
  groupMap: Map<string, PredictOutcomeGroup>;
  activeChipKey: string;
  onBetPress: (token: PredictOutcomeToken) => void;
  refreshing: boolean;
  onRefresh: () => void;
  showTabBar: boolean;
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  activeTab: number;
  onTabPress: (tabIndex: number) => void;
  showChips: boolean;
  chips: { key: string; label: string }[];
  onChipSelect: (key: string) => void;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  listHeaderComponent?: React.ReactElement;
}

const PredictGameDetailsOutcomesList = memo(
  ({
    market,
    enabled,
    groupMap,
    activeChipKey,
    onBetPress,
    refreshing,
    onRefresh,
    showTabBar,
    tabs,
    activeTab,
    onTabPress,
    showChips,
    chips,
    onChipSelect,
    activePositions,
    claimablePositions,
    listHeaderComponent,
  }: PredictGameDetailsOutcomesListProps) => {
    const tw = useTailwind();
    const { colors } = useTheme();
    const showStickyHeader = showTabBar || showChips;
    const stickyHeaderIndices = useMemo(
      () => (showStickyHeader ? [listHeaderComponent ? 1 : 0] : undefined),
      [listHeaderComponent, showStickyHeader],
    );

    return (
      <Box
        testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}
        twClassName="flex-1"
      >
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
          showsVerticalScrollIndicator={false}
        >
          {listHeaderComponent}
          {showStickyHeader && (
            <Box twClassName="bg-default">
              {showTabBar && (
                <PredictMarketDetailsTabBar
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabPress={onTabPress}
                />
              )}
              {showChips && (
                <PredictChipList
                  chips={chips}
                  activeChipKey={activeChipKey}
                  onChipSelect={onChipSelect}
                />
              )}
            </Box>
          )}
          <PredictGameDetailsTabsContent
            market={market}
            activeTab={activeTab}
            tabs={tabs}
            enabled={enabled}
            showTabBar={showTabBar}
            activePositions={activePositions}
            claimablePositions={claimablePositions}
            groupMap={groupMap}
            activeChipKey={activeChipKey}
            onBetPress={onBetPress}
          />
        </ScrollView>
      </Box>
    );
  },
);

PredictGameDetailsOutcomesList.displayName = 'PredictGameDetailsOutcomesList';

export default PredictGameDetailsOutcomesList;
