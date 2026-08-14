import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  HeaderStandard,
  IconName,
} from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectBridgeViewMode,
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { BridgeViewMode } from '../../types';
import {
  selectBridgeLimitOrderTabEnabledFlag,
  selectBridgeRecurringBuyTabEnabledFlag,
} from '../../selectors/featureFlags';
import { BridgeTabKey } from './BridgeView.constants';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import BridgeMarketView from './BridgeMarketView';
import BridgeLimitOrderView from './BridgeLimitOrderView';
import BridgeRecurringBuyView from './BridgeRecurringBuyView';

const BridgeView = () => {
  // `selectedTab` drives the tabs bar and updates urgently so a press is
  // acknowledged on the same frame. `renderedTab` swaps the content, which is
  // expensive enough to drop frames, so it is deferred to a transition instead
  // of holding up that feedback.
  const [selectedTab, setSelectedTab] = useState<BridgeTabKey>(
    BridgeTabKey.Market,
  );
  const [renderedTab, setRenderedTab] = useState<BridgeTabKey>(
    BridgeTabKey.Market,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const isLimitOrderTabEnabled = useSelector(
    selectBridgeLimitOrderTabEnabledFlag,
  );
  const isRecurringBuyTabEnabled = useSelector(
    selectBridgeRecurringBuyTabEnabledFlag,
  );

  let headerTitle: string;
  if (bridgeViewMode === BridgeViewMode.Bridge) {
    headerTitle = strings('bridge.title');
  } else {
    headerTitle = strings('swaps.title');
  }

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleSlippageSettingsPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  }, [destToken?.chainId, navigation, sourceToken?.chainId]);

  // Slippage only applies to market orders. This follows the rendered tab so
  // the header and the content below it always describe the same tab.
  const endButtonIconProps = useMemo(
    () =>
      renderedTab === BridgeTabKey.Market
        ? [
            {
              iconName: IconName.Setting,
              onPress: handleSlippageSettingsPress,
              testID: BridgeViewSelectorsIDs.SLIPPAGE_SETTINGS_BUTTON,
              accessibilityLabel: strings('bridge.slippage'),
            },
          ]
        : undefined,
    [renderedTab, handleSlippageSettingsPress],
  );

  // Limit and Recurring are still work-in-progress, so each is only added to
  // the tab list once its own feature flag is enabled. When both are
  // disabled, only Market remains and the tabs bar is hidden entirely below.
  const tabs = useMemo<TabItem[]>(() => {
    const visibleTabs: TabItem[] = [
      {
        key: BridgeTabKey.Market,
        label: strings('bridge.tabs.market'),
        content: null,
        testID: BridgeViewSelectorsIDs.MARKET_TAB,
      },
    ];

    if (isLimitOrderTabEnabled) {
      visibleTabs.push({
        key: BridgeTabKey.Limit,
        label: strings('bridge.tabs.limit'),
        content: null,
        testID: BridgeViewSelectorsIDs.LIMIT_TAB,
      });
    }

    if (isRecurringBuyTabEnabled) {
      visibleTabs.push({
        key: BridgeTabKey.Recurring,
        label: strings('bridge.tabs.recurring'),
        content: null,
        testID: BridgeViewSelectorsIDs.RECURRING_TAB,
      });
    }

    return visibleTabs;
  }, [isLimitOrderTabEnabled, isRecurringBuyTabEnabled]);

  const showTabsBar = tabs.length > 1;

  const activeIndex = useMemo(
    () =>
      Math.max(
        tabs.findIndex((tab) => tab.key === selectedTab),
        0,
      ),
    [tabs, selectedTab],
  );

  const handleTabPress = useCallback(
    (index: number) => {
      const nextTab = (tabs[index]?.key as BridgeTabKey) ?? BridgeTabKey.Market;
      setSelectedTab(nextTab);
      startTransition(() => setRenderedTab(nextTab));
    },
    [tabs],
  );

  // A tab can disappear if its feature flag flips off while it's active
  // (e.g. remote flag update). Fall back to Market rather than rendering
  // nothing.
  useEffect(() => {
    if (!tabs.some((tab) => tab.key === renderedTab)) {
      setSelectedTab(BridgeTabKey.Market);
      setRenderedTab(BridgeTabKey.Market);
    }
  }, [tabs, renderedTab]);

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        title={headerTitle}
        onBack={handleBack}
        endButtonIconProps={endButtonIconProps}
        includesTopInset
      />
      {showTabsBar ? (
        <TabsBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          testID={BridgeViewSelectorsIDs.TABS_BAR}
        />
      ) : null}
      {renderedTab === BridgeTabKey.Market ? <BridgeMarketView /> : null}
      {renderedTab === BridgeTabKey.Limit ? <BridgeLimitOrderView /> : null}
      {renderedTab === BridgeTabKey.Recurring ? (
        <BridgeRecurringBuyView />
      ) : null}
    </Box>
  );
};

export default BridgeView;
