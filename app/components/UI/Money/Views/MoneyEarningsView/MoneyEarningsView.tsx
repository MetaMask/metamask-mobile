import React, { useCallback } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectMoneyBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/moneyBrandRefresh';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import EarningsTab from './EarningsTab';

type MoneyEarningsRoute = RouteProp<MoneyNavigationParamList, 'MoneyEarnings'>;

// TODO: Implement tab navigation when building APY and Allocation tabs.
const handleTabPress = (): undefined => undefined;

const MoneyEarningsView = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const isGlassHeader = useSelector(selectMoneyBrandRefreshEnabled) === true;
  const { params } = useRoute<MoneyEarningsRoute>();
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();
  const { navigateToMoneyDeposit } = useMoneyDepositNavigation();
  const requestedTab = params?.activeTab ?? 'earnings';
  const activeTab = requestedTab === 'earnings' ? requestedTab : 'earnings';
  const tabs: TabItem[] = [
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
  ];
  const activeTabIndex = tabs.findIndex(({ key }) => key === activeTab);

  const handleWithdraw = useCallback((): void => {
    initiateWithdrawal();
  }, [initiateWithdrawal]);
  const handleAdd = useCallback((): void => {
    navigateToMoneyDeposit();
  }, [navigateToMoneyDeposit]);

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
      {activeTab === 'earnings' ? <EarningsTab isActive /> : null}
      <Box
        twClassName="gap-3 px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            onPress={handleWithdraw}
            testID={MoneyEarningsViewTestIds.WITHDRAW_BUTTON}
          >
            {strings('money.earnings.withdraw')}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            onPress={handleAdd}
            testID={MoneyEarningsViewTestIds.ADD_BUTTON}
          >
            {strings('money.earnings.add')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default MoneyEarningsView;
