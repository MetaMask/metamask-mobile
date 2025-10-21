import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import React from 'react';
import { View } from 'react-native';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import TabBar from '../../../../Base/TabBar';
import { PredictEventValues } from '../../constants/eventNames';
import MarketListContent from '../MarketListContent';

interface PredictMarketListProps {
  isSearchVisible: boolean;
  searchQuery: string;
}

const PredictMarketList: React.FC<PredictMarketListProps> = ({
  isSearchVisible,
  searchQuery,
}) => {
  const tw = useTailwind();

  return (
    <>
      {isSearchVisible && searchQuery.length > 0 && (
        <ScrollableTabView
          renderTabBar={false}
          style={tw.style('flex-1 w-full')}
          initialPage={0}
        >
          <View key="search" style={tw.style('flex-1 pt-4 w-full')}>
            <MarketListContent
              category="trending"
              q={searchQuery}
              entryPoint={PredictEventValues.ENTRY_POINT.SEARCH}
            />
          </View>
        </ScrollableTabView>
      )}

      {!isSearchVisible && (
        <Box style={tw.style('flex-1 w-full')}>
          <ScrollableTabView
            renderTabBar={() => (
              <TabBar textStyle={tw.style('text-base font-bold')} />
            )}
            style={tw.style('flex-1 w-full')}
            initialPage={0}
          >
            <View
              key="trending"
              {...{ tabLabel: strings('predict.category.trending') }}
              style={tw.style('flex-1 pt-4 w-full')}
              testID={PredictMarketListSelectorsIDs.TRENDING_TAB}
            >
              <MarketListContent category="trending" />
            </View>

            <View
              key="new"
              {...{ tabLabel: strings('predict.category.new') }}
              style={tw.style('flex-1 pt-4 w-full')}
              testID={PredictMarketListSelectorsIDs.NEW_TAB}
            >
              <MarketListContent category="new" />
            </View>

            <View
              key="sports"
              {...{ tabLabel: strings('predict.category.sports') }}
              style={tw.style('flex-1 pt-4 w-full')}
              testID={PredictMarketListSelectorsIDs.SPORTS_TAB}
            >
              <MarketListContent category="sports" />
            </View>

            <View
              key="crypto"
              {...{ tabLabel: strings('predict.category.crypto') }}
              style={tw.style('flex-1 pt-4 w-full')}
              testID={PredictMarketListSelectorsIDs.CRYPTO_TAB}
            >
              <MarketListContent category="crypto" />
            </View>

            <View
              key="politics"
              {...{ tabLabel: strings('predict.category.politics') }}
              style={tw.style('flex-1 pt-4 w-full')}
              testID={PredictMarketListSelectorsIDs.POLITICS_TAB}
            >
              <MarketListContent category="politics" />
            </View>
          </ScrollableTabView>
        </Box>
      )}
    </>
  );
};

export default PredictMarketList;
