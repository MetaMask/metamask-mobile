import React, { useCallback, useRef } from 'react';
import { LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictSearch } from '../../hooks/usePredictSearch';
import { usePredictSectionImpressions } from '../../hooks/usePredictSectionImpressions';
import { usePredictStackedHeader } from '../../hooks/usePredictStackedHeader';
import { PredictNavigationParamList } from '../../types/navigation';
import PredictHeaderStacked from '../../components/PredictHeaderStacked';
import PredictSearchOverlay from '../../components/PredictSearchOverlay';
import PredictWithdrawUnavailableSheet, {
  type PredictWithdrawUnavailableSheetRef,
} from '../../components/PredictWithdrawUnavailableSheet';
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
  // Use the entry point the navigator passed; do NOT default. Falling back to a
  // concrete value (e.g. `predict_feed`) would attribute home search engagement
  // to the wrong surface. When unknown, the analytics mapper omits `entry_point`
  // rather than bucketing it incorrectly.
  const entryPoint = route.params?.entryPoint;

  const { scrollY, titleSectionHeight, onScroll, setTitleSectionHeight } =
    usePredictStackedHeader();

  const handleSectionViewed = useCallback(
    (sectionId: string) => {
      Engine.context.PredictController.trackHomeSectionInteraction({
        sectionId,
        actionType: PredictEventValues.ACTION_TYPE.VIEWED,
        entryPoint,
      });
    },
    [entryPoint],
  );

  const {
    registerSection,
    setViewportHeight,
    reset: resetImpressions,
  } = usePredictSectionImpressions({
    scrollY,
    onSectionViewed: handleSectionViewed,
  });

  // Fire "home viewed" once per focus, and reset section impressions so a
  // return visit can re-fire section-viewed events.
  useFocusEffect(
    useCallback(() => {
      Engine.context.PredictController.trackHomeViewed({ entryPoint });
      resetImpressions();
    }, [entryPoint, resetImpressions]),
  );

  const {
    isSearchVisible,
    searchQuery,
    setSearchQuery,
    showSearch,
    clearSearchAndClose,
  } = usePredictSearch();

  const handleShowSearch = useCallback(() => {
    Engine.context.PredictController.trackSearchInteracted({
      interactionType: PredictEventValues.SEARCH_INTERACTION.OPENED,
      entryPoint,
    });
    showSearch();
  }, [entryPoint, showSearch]);

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

  const withdrawUnavailableSheetRef =
    useRef<PredictWithdrawUnavailableSheetRef>(null);
  const handleDepositWalletWithdrawPress = useCallback(() => {
    withdrawUnavailableSheetRef.current?.onOpenBottomSheet();
  }, []);

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
          onSearchPress={handleShowSearch}
        />

        <Animated.ScrollView
          testID={PredictHomeSelectorsIDs.SCROLL_VIEW}
          onScroll={onScroll}
          onLayout={setViewportHeight}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pb-8')}
        >
          <Box
            testID={PredictHomeSelectorsIDs.TITLE_SECTION}
            onLayout={handleTitleLayout}
            twClassName="pt-2 pb-2"
          >
            <Text
              testID={PredictHomeSelectorsIDs.TITLE}
              variant={TextVariant.DisplayMd}
            >
              {strings('wallet.predict')}
            </Text>
          </Box>

          <Box twClassName="gap-6">
            <PredictPortfolioModule
              onDepositWalletWithdrawPress={handleDepositWalletWithdrawPress}
            />
            <Box
              testID={PredictHomeSelectorsIDs.LIVE_NOW_IMPRESSION}
              onLayout={registerSection(PredictEventValues.SECTION_ID.LIVE_NOW)}
            >
              <PredictLiveNowSection />
            </Box>
            <Box
              testID={PredictHomeSelectorsIDs.CATEGORIES_IMPRESSION}
              onLayout={registerSection(
                PredictEventValues.SECTION_ID.CATEGORIES,
              )}
            >
              <PredictCategoriesSection />
            </Box>
            <Box
              testID={PredictHomeSelectorsIDs.POPULAR_TODAY_IMPRESSION}
              onLayout={registerSection(
                PredictEventValues.SECTION_ID.POPULAR_TODAY,
              )}
            >
              <PredictPopularTodaySection />
            </Box>
            <Box
              testID={PredictHomeSelectorsIDs.TRENDING_IMPRESSION}
              onLayout={registerSection(PredictEventValues.SECTION_ID.TRENDING)}
            >
              <PredictTrendingSection />
            </Box>
          </Box>
        </Animated.ScrollView>

        <PredictSearchOverlay
          isVisible={isSearchVisible}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={clearSearchAndClose}
          transactionActiveAbTests={transactionActiveAbTests}
          entryPoint={entryPoint}
        />
      </Box>
      <Box pointerEvents="box-none" twClassName="absolute inset-0 z-50">
        <PredictWithdrawUnavailableSheet ref={withdrawUnavailableSheetRef} />
      </Box>
    </SafeAreaView>
  );
};

export default PredictHome;
