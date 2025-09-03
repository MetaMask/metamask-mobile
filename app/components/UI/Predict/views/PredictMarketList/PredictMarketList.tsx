import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View, SafeAreaView } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
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

interface PredictMarketListProps {}

const PredictMarketList: React.FC<PredictMarketListProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tw = useTailwind();

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

  return (
    <SafeAreaView
      style={tw.style('flex-1', { backgroundColor: colors.background.default })}
    >
      <View style={styles.wrapper}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="w-full py-2"
        >
          <Text variant={TextVariant.HeadingLG}>Prediction Markets</Text>
          <Icon
            name={IconName.Search}
            size={IconSize.Lg}
            color={colors.text.default}
          />
        </Box>

        <ScrollableTabView
          renderTabBar={() => (
            <TabBar textStyle={tw.style('text-base font-bold')} />
          )}
          style={styles.tabView}
          initialPage={0}
        >
          <View
            key="trending"
            {...{ tabLabel: 'Trending' }}
            style={styles.tabContent}
          >
            <MarketListContent category="trending" />
          </View>

          <View key="new" {...{ tabLabel: 'New' }} style={styles.tabContent}>
            <MarketListContent category="new" />
          </View>

          <View
            key="sports"
            {...{ tabLabel: 'Sports' }}
            style={styles.tabContent}
          >
            <MarketListContent category="sports" />
          </View>

          <View
            key="crypto"
            {...{ tabLabel: 'Crypto' }}
            style={styles.tabContent}
          >
            <MarketListContent category="crypto" />
          </View>

          <View
            key="politics"
            {...{ tabLabel: 'Politics' }}
            style={styles.tabContent}
          >
            <MarketListContent category="politics" />
          </View>
        </ScrollableTabView>
      </View>
    </SafeAreaView>
  );
};

export default PredictMarketList;
