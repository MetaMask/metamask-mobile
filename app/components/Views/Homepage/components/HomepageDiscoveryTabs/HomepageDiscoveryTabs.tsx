import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Reanimated, { SharedValue } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import TabsList from '../../../../../component-library/components-temp/Tabs/TabsList';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { TabsListRef } from '../../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import Homepage from '../../Homepage';
import PerpsHomeView from '../../../../UI/Perps/Views/PerpsHomeView/PerpsHomeView';
import PredictFeed from '../../../../UI/Predict/views/PredictFeed';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { PredictPreviewSheetProvider } from '../../../../UI/Predict/contexts';
import { SectionRefreshHandle } from '../../types';
import { IconName } from '../../../../../component-library/components/Icons/Icon/Icon.types';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './HomepageDiscoveryTabs.styles';
import { useDiscoveryScrollManager } from '../../../../UI/Predict/hooks/useDiscoveryScrollManager';
import { TabIconAnimationContext } from '../../../../../component-library/components-temp/Tabs/Tab/TabIconAnimationContext';

// Tab indices — kept as a const so future tabs can be added without renumbering.
const TAB_INDEX = {
  PORTFOLIO: 0,
  PERPETUALS: 1,
  PREDICTIONS: 2,
} as const;

// Static per-tab gradient color stops. Keyed by TAB_INDEX so adding a new tab
// only requires adding an entry here.
// Design spec: linear-gradient(180deg, <color> 0%, rgba(<color>, 0) 100%)
const TAB_GRADIENT_COLORS: Record<number, [string, string, string]> = {
  [TAB_INDEX.PORTFOLIO]: [
    'rgba(75, 80, 92, 0.9)',
    'rgba(75, 80, 92, 0.2)',
    'transparent',
  ],
  [TAB_INDEX.PERPETUALS]: [
    'rgba(25, 0, 102, 0.9)',
    'rgba(25, 0, 102, 0.2)',
    'transparent',
  ],
  [TAB_INDEX.PREDICTIONS]: [
    'rgba(61, 6, 95, 0.9)',
    'rgba(61, 6, 95, 0.2)',
    'transparent',
  ],
};

/**
 * Thin wrapper that exposes a `tabLabel` prop consumed by TabsList to build
 * the tab bar. The children are rendered as the tab's content.
 */
interface DiscoveryTabViewProps {
  tabLabel: string;
  tabIcon?: IconName;
  children?: React.ReactNode;
}

const discoveryTabViewStyles = StyleSheet.create({ root: { flex: 1 } });

const DiscoveryTabView: React.FC<DiscoveryTabViewProps> = ({ children }) => (
  <View style={discoveryTabViewStyles.root}>{children}</View>
);

export interface HomepageDiscoveryTabsProps {
  /**
   * Content rendered above the Homepage sections inside the Portfolio tab scroll.
   * Receives AccountGroupBalance, AssetDetailsActions, and Carousel from Wallet.
   */
  portfolioHeader?: React.ReactNode;
  /**
   * Forwarded to the Portfolio tab ScrollView — used by HomepageScrollContext
   * pub/sub to notify scroll subscribers without triggering re-renders.
   */
  onPortfolioScroll?: () => void;
  /**
   * RefreshControl element for pull-to-refresh on the Portfolio tab.
   */
  refreshControl?: React.ReactElement;
  /**
   * Combined height of the wallet header + safe area top inset, used to
   * position the gradient overlay so it bleeds up into the header area.
   */
  walletHeaderOffset?: number;
  /**
   * Reanimated SharedValue controlling vertical translation of the wallet header.
   * Updated from the scroll worklet so the header hides/shows on the native thread.
   */
  walletHeaderTranslateY?: SharedValue<number>;
  /**
   * Height of the wallet header — used to know how far to translate it off screen.
   */
  walletHeaderHeight?: number;
}

/**
 * HomepageDiscoveryTabs
 *
 * Hub Page Navigational Discovery Tabs (coreMCU589AbtestHubPageDiscoveryTabs).
 *
 * Uses the design-system TabsList which renders the TabsBar at the top and
 * lazy-mounts tab content via InteractionManager — screens only initialise
 * when the user first visits that tab.
 *
 * Tabs:
 * - Portfolio: scrollable homepage sections with balance header
 * - Perpetuals: PerpsHomeView wrapped in connection + stream providers
 * - Predictions: PredictFeed wrapped in preview sheet provider
 */
const HomepageDiscoveryTabs = forwardRef<
  SectionRefreshHandle,
  HomepageDiscoveryTabsProps
>(
  (
    {
      portfolioHeader,
      onPortfolioScroll,
      refreshControl,
      walletHeaderOffset = 0,
      walletHeaderTranslateY,
      walletHeaderHeight = 0,
    },
    ref,
  ) => {
    const tabsRef = useRef<TabsListRef>(null);
    const homepageRef = useRef<SectionRefreshHandle>(null);
    const tw = useTailwind();
    const { styles } = useStyles(styleSheet, {});
    // Refs hold gradient colors so they can be updated without causing re-renders
    // during the animation. Only one re-render is triggered at transition start
    // (via gradientTick), keeping the native-thread opacity animation stutter-free.
    const activeGradientColors = useRef(
      TAB_GRADIENT_COLORS[TAB_INDEX.PORTFOLIO],
    );
    const previousGradientColors = useRef(
      TAB_GRADIENT_COLORS[TAB_INDEX.PORTFOLIO],
    );
    const [gradientTick, setGradientTick] = useState(0);

    // Animates the OUTGOING gradient out (1 → 0), not the incoming one in.
    // This avoids the one-frame flash that occurs when react-native-linear-gradient
    // re-renders a visible layer with new colors.
    const fadeOutAnim = useRef(new Animated.Value(0)).current;

    // 0 = icons expanded (header visible), 1 = icons collapsed (header hidden)
    const iconCollapseAnim = useRef(new Animated.Value(0)).current;

    const { headerHidden, scrollHandler, onTabSwitch } =
      useDiscoveryScrollManager({
        walletHeaderHeight,
        walletHeaderTranslateY,
        onPortfolioScroll,
      });

    // Animate icons in/out slightly after the header starts moving.
    // Delay on hide lets the header lead; no delay on show snaps icons back promptly.
    useEffect(() => {
      const anim = Animated.timing(iconCollapseAnim, {
        toValue: headerHidden ? 1 : 0,
        duration: headerHidden ? 500 : 400,
        delay: headerHidden ? 100 : 150,
        useNativeDriver: false,
      });
      anim.start();
      return () => anim.stop();
    }, [headerHidden, iconCollapseAnim]);

    useImperativeHandle(ref, () => ({
      refresh: async () => {
        await homepageRef.current?.refresh();
      },
    }));

    const handleChangeTab = useCallback(
      ({ i }: { i: number }) => {
        onTabSwitch();

        // Capture colors into refs before the single re-render.
        previousGradientColors.current = activeGradientColors.current;
        activeGradientColors.current =
          TAB_GRADIENT_COLORS[i] ?? TAB_GRADIENT_COLORS[TAB_INDEX.PORTFOLIO];

        // Pin outgoing opacity to 1 before the re-render paints new colors.
        fadeOutAnim.setValue(1);

        // One re-render to paint updated colors, then animation runs uninterrupted.
        setGradientTick((t) => t + 1);

        Animated.timing(fadeOutAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();
      },
      [fadeOutAnim, onTabSwitch],
    );

    return (
      <TabIconAnimationContext.Provider value={{ iconCollapseAnim }}>
        <View style={styles.flex}>
          <TabsList
            ref={tabsRef}
            initialActiveIndex={TAB_INDEX.PORTFOLIO}
            onChangeTab={handleChangeTab}
            tabsListContentTwClassName="px-0"
            style={tw.style('mt-2')}
          >
            <DiscoveryTabView tabLabel="Portfolio" tabIcon={IconName.Portfolio}>
              <Reanimated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                refreshControl={refreshControl}
              >
                <View style={tw.style('mt-4 mb-2')}>{portfolioHeader}</View>
                <Homepage ref={homepageRef} />
              </Reanimated.ScrollView>
            </DiscoveryTabView>

            <DiscoveryTabView
              tabLabel="Perpetuals"
              tabIcon={IconName.Candlestick}
            >
              <PerpsConnectionProvider suppressErrorView>
                <PerpsStreamProvider>
                  <PerpsHomeView hideHeader />
                </PerpsStreamProvider>
              </PerpsConnectionProvider>
            </DiscoveryTabView>

            <DiscoveryTabView tabLabel="Predictions" tabIcon={IconName.Predict}>
              <PredictPreviewSheetProvider>
                <PredictFeed hideHeader />
              </PredictPreviewSheetProvider>
            </DiscoveryTabView>
          </TabsList>

          {/* Gradient overlay — crossfades between tab colors, bleeds up into the wallet header */}
          {walletHeaderOffset > 0 && (
            <>
              {/* Incoming gradient — always fully opaque underneath; rendered first so it
                  is never exposed before the outgoing gradient fades out, avoiding the
                  one-frame white flash that occurs when LinearGradient re-renders visibly.
                  key={gradientTick} remounts the native gradient view on each transition
                  so it starts clean, and satisfies the ref-read needed for React to
                  re-evaluate activeGradientColors.current after handleChangeTab fires. */}
              <LinearGradient
                key={gradientTick}
                colors={activeGradientColors.current}
                locations={[0, 0.4, 1.0]}
                style={[
                  styles.gradient,
                  {
                    top: -walletHeaderOffset,
                    height: walletHeaderOffset + 175,
                  },
                ]}
              />
              {/* Outgoing gradient — sits on top and fades out, revealing the incoming layer */}
              <Animated.View
                style={[
                  styles.gradient,
                  {
                    top: -walletHeaderOffset,
                    height: walletHeaderOffset + 175,
                    opacity: fadeOutAnim,
                  },
                ]}
              >
                <LinearGradient
                  colors={previousGradientColors.current}
                  locations={[0, 0.4, 1.0]}
                  style={styles.gradientFill}
                />
              </Animated.View>
            </>
          )}
        </View>
      </TabIconAnimationContext.Provider>
    );
  },
);

HomepageDiscoveryTabs.displayName = 'HomepageDiscoveryTabs';

export default HomepageDiscoveryTabs;
