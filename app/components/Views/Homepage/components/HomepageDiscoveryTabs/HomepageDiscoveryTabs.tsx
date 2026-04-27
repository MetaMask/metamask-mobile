import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Reanimated, {
  SharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
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
import { useTheme } from '../../../../../util/theme';
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
    const perpsTabEnterRef = useRef<(() => void) | null>(null);
    const tw = useTailwind();
    const { styles } = useStyles(styleSheet, {});
    const { themeAppearance } = useTheme();
    const isDarkMode = themeAppearance === 'dark';
    // One Animated.Value per tab — pre-rendered at mount so no re-render is needed
    // during a tab switch. Portfolio starts fully visible; others start at 0.
    const tabGradientOpacities = useRef(
      Object.keys(TAB_GRADIENT_COLORS).map(
        (_, i) => new Animated.Value(i === TAB_INDEX.PORTFOLIO ? 1 : 0),
      ),
    ).current;
    const activeTabIndexRef = useRef<number>(TAB_INDEX.PORTFOLIO);

    // 0 = icons expanded (header visible), 1 = icons collapsed (header hidden)
    const iconCollapseAnim = useRef(new Animated.Value(0)).current;
    // Ref so the animated reaction closure always calls the latest animation starter
    const iconCollapseAnimRef = useRef(iconCollapseAnim);

    // Triggered directly from the scroll worklet via onHeaderHiddenChange —
    // fires in the same frame as the hide/show decision, not based on position.
    const animateIcons = useCallback((hidden: boolean) => {
      Animated.timing(iconCollapseAnimRef.current, {
        toValue: hidden ? 1 : 0,
        duration: hidden ? 300 : 250,
        useNativeDriver: true,
      }).start();
    }, []);

    const { scrollHandler, onTabEnter: portfolioOnTabEnter } =
      useDiscoveryScrollManager({
        walletHeaderHeight,
        walletHeaderTranslateY,
        onPortfolioScroll,
        onHeaderHiddenChange: animateIcons,
      });

    useImperativeHandle(ref, () => ({
      refresh: async () => {
        await homepageRef.current?.refresh();
      },
    }));

    const handleChangeTab = useCallback(
      ({ i }: { i: number }) => {
        // Restore each tab's own header state on entry.
        // Predictions has no scroll manager so we always show the header.
        if (i === TAB_INDEX.PORTFOLIO) {
          portfolioOnTabEnter();
        } else if (i === TAB_INDEX.PERPETUALS) {
          if (perpsTabEnterRef.current) {
            perpsTabEnterRef.current();
          } else {
            // First visit — Perps not mounted yet so ref is null. It will mount
            // at the top of scroll, so show the header/icons immediately.
            walletHeaderTranslateY &&
              (walletHeaderTranslateY.value = withTiming(0, {
                duration: 250,
                easing: Easing.out(Easing.cubic),
              }));
            Animated.timing(iconCollapseAnimRef.current, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Predictions has no scroll manager — always show header + icons on entry.
          walletHeaderTranslateY &&
            (walletHeaderTranslateY.value = withTiming(0, {
              duration: 250,
              easing: Easing.out(Easing.cubic),
            }));
          Animated.timing(iconCollapseAnimRef.current, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }

        const prevIndex = activeTabIndexRef.current;
        activeTabIndexRef.current = i;

        if (prevIndex !== i) {
          // Snap outgoing to 1 and incoming to 0 before animating, in case a
          // previous transition was interrupted mid-flight.
          tabGradientOpacities[prevIndex].setValue(1);
          tabGradientOpacities[i].setValue(0);

          Animated.parallel([
            Animated.timing(tabGradientOpacities[prevIndex], {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(tabGradientOpacities[i], {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      [tabGradientOpacities, portfolioOnTabEnter, walletHeaderTranslateY],
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
            tabsBarProps={{ fillWidth: true }}
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
                  <PerpsHomeView
                    hideHeader
                    walletHeaderTranslateY={walletHeaderTranslateY}
                    walletHeaderHeight={walletHeaderHeight}
                    tabEnterCallbackRef={perpsTabEnterRef}
                    onHeaderHiddenChange={animateIcons}
                  />
                </PerpsStreamProvider>
              </PerpsConnectionProvider>
            </DiscoveryTabView>

            <DiscoveryTabView tabLabel="Predictions" tabIcon={IconName.Predict}>
              <PredictPreviewSheetProvider>
                <PredictFeed hideHeader />
              </PredictPreviewSheetProvider>
            </DiscoveryTabView>
          </TabsList>

          {/* Gradient overlay — dark mode only. One layer per tab, each always mounted
              with fixed colors. Crossfade is pure opacity animation on the native thread —
              no state update or unmount/remount during the transition.
              Outer wrapper fades the entire gradient out when the header/icons collapse. */}
          {walletHeaderOffset > 0 &&
            isDarkMode &&
            Object.entries(TAB_GRADIENT_COLORS).map(([idx, colors]) => (
              <Animated.View
                key={idx}
                style={[
                  styles.gradient,
                  {
                    top: -walletHeaderOffset,
                    height: walletHeaderOffset + 175,
                    opacity: Animated.multiply(
                      tabGradientOpacities[Number(idx)],
                      iconCollapseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    ),
                  },
                ]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={colors}
                  locations={[0, 0.6, 1.0]}
                  style={styles.gradientFill}
                />
              </Animated.View>
            ))}
        </View>
      </TabIconAnimationContext.Provider>
    );
  },
);

HomepageDiscoveryTabs.displayName = 'HomepageDiscoveryTabs';

export default HomepageDiscoveryTabs;
