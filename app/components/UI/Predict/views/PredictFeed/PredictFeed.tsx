import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { useTheme } from '../../../../../util/theme';
import { PredictBalance } from '../../components/PredictBalance';
import PredictFeedHeader from '../../components/PredictFeedHeader';
import PredictMarketList from '../../components/PredictMarketList';

const PredictFeed = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchToggle = () => {
    setIsSearchVisible(true);
  };

  const handleSearchCancel = () => {
    setIsSearchVisible(false);
    setSearchQuery('');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <SafeAreaView
      testID={PredictMarketListSelectorsIDs.CONTAINER}
      style={tw.style('flex-1', {
        backgroundColor: colors.background.default,
      })}
    >
      <View style={tw.style('flex-1 pt-2 px-6')}>
        <PredictFeedHeader
          isSearchVisible={isSearchVisible}
          onSearchToggle={handleSearchToggle}
          onSearchCancel={handleSearchCancel}
          onSearch={handleSearch}
        />
        {!isSearchVisible && <PredictBalance />}
        <PredictMarketList
          isSearchVisible={isSearchVisible}
          searchQuery={searchQuery}
        />
      </View>
    </SafeAreaView>
  );
};

export default PredictFeed;
