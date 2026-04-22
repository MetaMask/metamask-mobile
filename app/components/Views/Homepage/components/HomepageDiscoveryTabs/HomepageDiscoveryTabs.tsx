import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
    },
    ref,
  ) => {
    const tabsRef = useRef<TabsListRef>(null);
    const homepageRef = useRef<SectionRefreshHandle>(null);
    const tw = useTailwind();
    const { styles } = useStyles(styleSheet, {});
    const [activeTabIndex, setActiveTabIndex] = useState<number>(
      TAB_INDEX.PORTFOLIO,
    );

    useImperativeHandle(ref, () => ({
      refresh: async () => {
        await homepageRef.current?.refresh();
      },
    }));

    const handleChangeTab = useCallback(({ i }: { i: number }) => {
      setActiveTabIndex(i);
    }, []);

    const gradientColors =
      TAB_GRADIENT_COLORS[activeTabIndex] ??
      TAB_GRADIENT_COLORS[TAB_INDEX.PORTFOLIO];

    return (
      <View style={styles.flex}>
        <TabsList
          ref={tabsRef}
          initialActiveIndex={TAB_INDEX.PORTFOLIO}
          onChangeTab={handleChangeTab}
          tabsListContentTwClassName="px-0"
          style={tw.style('mt-4')}
        >
          <DiscoveryTabView tabLabel="Portfolio" tabIcon={IconName.Portfolio}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              onScroll={onPortfolioScroll}
              scrollEventThrottle={16}
              refreshControl={refreshControl}
            >
              <View style={tw.style('mt-4 mb-2')}>{portfolioHeader}</View>
              <Homepage ref={homepageRef} />
            </ScrollView>
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

        {/* Gradient overlay — color changes per active tab, bleeds up into the wallet header */}
        {walletHeaderOffset > 0 && (
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.4, 1.0]}
            style={[
              styles.gradient,
              { top: -walletHeaderOffset, height: walletHeaderOffset + 175 },
            ]}
          />
        )}
      </View>
    );
  },
);

HomepageDiscoveryTabs.displayName = 'HomepageDiscoveryTabs';

export default HomepageDiscoveryTabs;
