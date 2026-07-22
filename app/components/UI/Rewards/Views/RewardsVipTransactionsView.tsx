import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import VipPerpsTransactionRow from '../components/Vip/VipPerpsTransactionRow';
import VipSwapTransactionRow from '../components/Vip/VipSwapTransactionRow';
import { useGetVipTransactions } from '../hooks/useGetVipTransactions';
import { useVipDashboard } from '../hooks/useVipDashboard';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { formatRewardsDateLabel } from '../utils/formatUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type {
  VipTransactionDto,
  VipTransactionType,
} from '../../../../core/Engine/controllers/rewards-controller/types';

type TransactionListItem =
  | { kind: 'date-header'; dateKey: string; label: string }
  | { kind: 'transaction'; transaction: VipTransactionDto; index: number };

export const REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-vip-transactions-container',
  TYPE_SELECTOR: 'rewards-vip-transactions-type-selector',
  LIST: 'rewards-vip-transactions-list',
} as const;

const RewardsVipTransactionsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [selectedType, setSelectedType] = useState<VipTransactionType>('PERPS');

  useTrackRewardsPageView({
    page_type: 'vip_transactions',
  });

  const { dashboard } = useVipDashboard();
  const {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  } = useGetVipTransactions(selectedType);

  const headerTitle =
    dashboard?.localizedText.transactionsTitle || 'Transactions';

  const typeOptions = useMemo(
    () => [
      {
        key: 'PERPS',
        value: 'PERPS',
        label: strings('rewards.vip_transactions.type_perps'),
      },
      {
        key: 'SWAP',
        value: 'SWAP',
        label: strings('rewards.vip_transactions.type_swap'),
      },
    ],
    [],
  );

  const selectedTypeLabel =
    typeOptions.find((option) => option.value === selectedType)?.label ??
    selectedType;

  const openTypeSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_SELECT_SHEET, {
      title: strings('rewards.vip_transactions.select_type'),
      options: typeOptions,
      selectedValue: selectedType,
      onSelect: (value: string) => setSelectedType(value as VipTransactionType),
    });
  }, [navigation, selectedType, typeOptions]);

  const groupedItems = useMemo<TransactionListItem[]>(() => {
    if (!transactions) return [];
    const items: TransactionListItem[] = [];
    let lastDateKey = '';
    transactions.forEach((transaction, index) => {
      const dateKey = transaction.timestamp.slice(0, 10);
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        items.push({
          kind: 'date-header',
          dateKey,
          label: formatRewardsDateLabel(new Date(transaction.timestamp)),
        });
      }
      items.push({ kind: 'transaction', transaction, index });
    });
    return items;
  }, [transactions]);

  const renderItem = useCallback(({ item }: { item: TransactionListItem }) => {
    if (item.kind === 'date-header') {
      return (
        <Box twClassName="px-4 pt-4 pb-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {item.label}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="px-4">
        {item.transaction.type === 'SWAP' ? (
          <VipSwapTransactionRow
            transaction={item.transaction}
            testID={`vip-transaction-row-${item.index}`}
          />
        ) : (
          <VipPerpsTransactionRow
            transaction={item.transaction}
            testID={`vip-transaction-row-${item.index}`}
          />
        )}
      </Box>
    );
  }, []);

  const keyExtractor = useCallback(
    (item: TransactionListItem, index: number) =>
      item.kind === 'date-header'
        ? `header-${item.dateKey}`
        : `transaction-${item.transaction.id}-${index}`,
    [],
  );

  const onEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <Box twClassName="py-4 items-center">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    if (error) {
      return (
        <Box twClassName="px-4 pt-2">
          <RewardsErrorBanner
            title={strings('rewards.vip_transactions.error_title')}
            description={strings('rewards.vip_transactions.error_description')}
            onConfirm={refresh}
            confirmButtonLabel={strings(
              'rewards.vip_transactions.retry_button',
            )}
          />
        </Box>
      );
    }

    return (
      <Box twClassName="px-4 pt-2">
        <RewardsInfoBanner
          title={strings('rewards.vip_transactions.empty_title')}
          description={strings('rewards.vip_transactions.empty_description')}
        />
      </Box>
    );
  }, [isLoading, error, refresh]);

  const renderListHeader = useCallback(() => {
    const showSkeletons =
      isLoading && (!transactions || transactions.length === 0);

    return (
      <Box>
        <Pressable
          onPress={openTypeSelector}
          testID={REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.TYPE_SELECTOR}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1 px-4 pt-2 pb-1"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {selectedTypeLabel}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Pressable>

        {showSkeletons ? (
          <Box twClassName="px-4 pb-2 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} style={tw.style('h-12 rounded-lg')} />
            ))}
          </Box>
        ) : null}
      </Box>
    );
  }, [isLoading, transactions, openTypeSelector, selectedTypeLabel, tw]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipTransactionsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={headerTitle}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'vip-transactions-back-button' }}
          includesTopInset
        />

        <FlatList<TransactionListItem>
          testID={REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.LIST}
          data={groupedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsVipTransactionsView;
