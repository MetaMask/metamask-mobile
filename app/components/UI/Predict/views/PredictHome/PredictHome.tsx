import React, { useCallback } from 'react';
import { LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { usePredictSearch } from '../../hooks/usePredictSearch';
import { usePredictStackedHeader } from '../../hooks/usePredictStackedHeader';
import { PredictNavigationParamList } from '../../types/navigation';
import PredictHeaderStacked from '../../components/PredictHeaderStacked';
import PredictSearchOverlay from '../../components/PredictSearchOverlay';
import { PredictPortfolioModule } from './components/PredictPortfolio';
import PredictLiveNowSection from './components/PredictLiveNowSection';
import PredictCategoriesSection from './components/PredictCategoriesSection';
import PredictPopularTodaySection from './components/PredictPopularTodaySection';
import PredictTrendingSection from './components/PredictTrendingSection';
import { PredictHomeSelectorsIDs } from '../../Predict.testIds';

/**
 * Redesigned Predict homepage shell (PRED-834).
 *
 * A single vertical scroll page with a stacked/collapsing header: a large
 * "Predictions" title sits at the top of the scroll content and collapses into
 * the nav bar's compact title as the user scrolls (Figma HeaderStackedStandard).
 * The body composes section-specific components in Figma order — placeholders
 * for now, swapped for real sections in later tickets.
 *
 * Mounted at the existing Predict MARKET_LIST route only when
 * `predictHomeRedesign.enabled` is true; otherwise `PredictFeed` renders.
 */
const PredictHome: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;

  const { scrollY, titleSectionHeight, onScroll, setTitleSectionHeight } =
    usePredictStackedHeader();

  const {
    isSearchVisible,
    searchQuery,
    setSearchQuery,
    showSearch,
    clearSearchAndClose,
  } = usePredictSearch();

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET_VIEW,
      });
    }
  }, [navigation]);

  const handleTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setTitleSectionHeight(event.nativeEvent.layout.height);
    },
    [setTitleSectionHeight],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        testID={PredictHomeSelectorsIDs.CONTAINER}
        twClassName="flex-1"
        style={{ backgroundColor: colors.background.default }}
      >
        <PredictHeaderStacked
          scrollY={scrollY}
          titleSectionHeight={titleSectionHeight}
          onBack={handleBackPress}
          onSearchPress={showSearch}
        />

        <Animated.ScrollView
          testID={PredictHomeSelectorsIDs.SCROLL_VIEW}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pb-8')}
        >
          <Box
            testID={PredictHomeSelectorsIDs.TITLE_SECTION}
            onLayout={handleTitleLayout}
            twClassName="pt-2 pb-4"
          >
            <Text
              testID={PredictHomeSelectorsIDs.TITLE}
              variant={TextVariant.DisplayMd}
            >
              {strings('wallet.predict')}
            </Text>
          </Box>

          <PredictPortfolioModule />
          <PredictLiveNowSection />
          <PredictCategoriesSection />
          <PredictPopularTodaySection />
          <PredictTrendingSection />
        </Animated.ScrollView>

        <PredictSearchOverlay
          isVisible={isSearchVisible}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={clearSearchAndClose}
          transactionActiveAbTests={transactionActiveAbTests}
        />
      </Box>
    </SafeAreaView>
  );
};

export default PredictHome;
