import React, { useCallback, useMemo, useState } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectMoneyBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/moneyBrandRefresh';
import type {
  MoneyEarningsTab,
  MoneyNavigationParamList,
} from '../../types/navigation';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import EarningsTab from './EarningsTab';
import MoneyEarningsFooter from './MoneyEarningsFooter';

type MoneyEarningsRoute = RouteProp<MoneyNavigationParamList, 'MoneyEarnings'>;

type MoneyEarningsTabItem = TabItem & { key: MoneyEarningsTab };

const getInitialActiveTab = (
  requestedTab: MoneyEarningsTab | undefined,
): MoneyEarningsTab =>
  requestedTab === 'earnings' ? requestedTab : 'earnings';

const isEnabledTab = (
  tab: MoneyEarningsTab,
): tab is Extract<MoneyEarningsTab, 'earnings'> => tab === 'earnings';

const MoneyEarningsView = (): React.ReactElement => {
  const navigation = useNavigation<AppNavigationProp>();
  const isGlassHeader = useSelector(selectMoneyBrandRefreshEnabled) === true;
  const { params } = useRoute<MoneyEarningsRoute>();
  const initialActiveTab = getInitialActiveTab(params?.activeTab);
  const [activeTab, setActiveTab] =
    useState<MoneyEarningsTab>(initialActiveTab);
  const tabs = useMemo<MoneyEarningsTabItem[]>(
    () => [
      {
        key: 'earnings',
        label: strings('money.earnings.tab_earnings'),
        content: null,
        testID: MoneyEarningsViewTestIds.TAB_EARNINGS,
      },
      {
        key: 'apy',
        label: strings('money.earnings.tab_apy'),
        content: null,
        isDisabled: true,
        testID: MoneyEarningsViewTestIds.TAB_APY,
      },
      {
        key: 'allocation',
        label: strings('money.earnings.tab_allocation'),
        content: null,
        isDisabled: true,
        testID: MoneyEarningsViewTestIds.TAB_ALLOCATION,
      },
    ],
    [],
  );
  const handleTabPress = useCallback(
    (index: number): void => {
      const selectedTab = tabs[index];
      if (
        !selectedTab ||
        selectedTab.isDisabled ||
        !isEnabledTab(selectedTab.key)
      ) {
        return;
      }

      setActiveTab(selectedTab.key);
    },
    [tabs],
  );
  const activeTabIndex = tabs.findIndex(({ key }) => key === activeTab);

  return (
    <Box
      testID={MoneyEarningsViewTestIds.CONTAINER}
      twClassName="flex-1 bg-default"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title={strings('money.earnings.title')}
        onBack={navigation.goBack}
        backButtonProps={{ testID: MoneyEarningsViewTestIds.BACK_BUTTON }}
      />
      <Box twClassName="py-4">
        <TabsBar
          tabs={tabs}
          activeIndex={activeTabIndex}
          onTabPress={handleTabPress}
        />
      </Box>
      {activeTab === 'earnings' ? (
        <Box
          testID={MoneyEarningsViewTestIds.EARNINGS_PANEL}
          twClassName="flex-1"
        >
          <EarningsTab />
        </Box>
      ) : null}
      <MoneyEarningsFooter />
    </Box>
  );
};

export default MoneyEarningsView;
