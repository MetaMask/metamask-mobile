import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, SafeAreaView, Pressable } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { getNavigationOptionsTitle } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import styleSheet from './PredictMarketList.styles';
import TabBar from '../../../../Base/TabBar';
import MarketListContent from '../../components/MarketListContent';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import SearchBox from '../../components/SearchBox';

interface PredictMarketListProps {}

const PredictMarketList: React.FC<PredictMarketListProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tw = useTailwind();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('predict.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

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
      style={tw.style('flex-1', { backgroundColor: colors.background.default })}
    >
      <View style={styles.wrapper}>
        {!isSearchVisible ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="w-full py-2"
          >
            <Text variant={TextVariant.HeadingLG}>Prediction Markets</Text>
            <Pressable onPress={handleSearchToggle}>
              <Icon
                name={IconName.Search}
                size={IconSize.Lg}
                color={colors.text.default}
              />
            </Pressable>
          </Box>
        ) : (
          <SearchBox
            isVisible={isSearchVisible}
            onCancel={handleSearchCancel}
            onSearch={handleSearch}
          />
        )}

        {isSearchVisible && searchQuery.length > 0 && (
          <ScrollableTabView
            renderTabBar={false}
            style={styles.tabView}
            initialPage={0}
          >
            <View key="search" style={styles.tabContent}>
              <MarketListContent category="trending" q={searchQuery} />
            </View>
          </ScrollableTabView>
        )}

        {!isSearchVisible && (
          <ScrollableTabView
            renderTabBar={() => (
              <TabBar textStyle={tw.style('text-base font-bold')} />
            )}
            style={styles.tabView}
            initialPage={0}
          >
            <View
              key="trending"
              {...{ tabLabel: strings('predict.category.trending') }}
              style={styles.tabContent}
            >
              <MarketListContent category="trending" />
            </View>

            <View
              key="new"
              {...{ tabLabel: strings('predict.category.new') }}
              style={styles.tabContent}
            >
              <MarketListContent category="new" />
            </View>

            <View
              key="sports"
              {...{ tabLabel: strings('predict.category.sports') }}
              style={styles.tabContent}
            >
              <MarketListContent category="sports" />
            </View>

            <View
              key="crypto"
              {...{ tabLabel: strings('predict.category.crypto') }}
              style={styles.tabContent}
            >
              <MarketListContent category="crypto" />
            </View>

            <View
              key="politics"
              {...{ tabLabel: strings('predict.category.politics') }}
              style={styles.tabContent}
            >
              <MarketListContent category="politics" />
            </View>
          </ScrollableTabView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PredictMarketList;
