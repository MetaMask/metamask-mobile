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
  BoxJustifyContent,
  FontWeight,
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
  EMPTY: 'rewards-vip-transactions-empty',
  SKELETON: 'rewards-vip-transactions-skeleton',
} as const;

const VipTransactionRowSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full py-3 gap-3"
    >
      <Skeleton style={tw.style('h-10 w-10 rounded-full')} />
      <Box twClassName="flex-1 gap-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Skeleton style={tw.style('h-4 w-16 rounded-lg')} />
          <Skeleton style={tw.style('h-4 w-20 rounded-lg')} />
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Skeleton style={tw.style('h-3 w-24 rounded-lg')} />
          <Skeleton style={tw.style('h-3 w-12 rounded-lg')} />
        </Box>
      </Box>
    </Box>
  );
};

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
    retry,
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
    if (
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      !isRefreshing &&
      transactions &&
      transactions.length > 0
    ) {
      loadMore();
    }
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, transactions, loadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || !transactions || transactions.length === 0) {
      return null;
    }
    return (
      <Box twClassName="py-4 items-center">
        <ActivityIndicator />
      </Box>
    );
  }, [isLoadingMore, transactions]);

  const isInitialLoadPending =
    isLoading || isRefreshing || transactions === null;

  const renderEmpty = useCallback(() => {
    if (error) {
      return (
        <Box twClassName="px-4 pt-2">
          <RewardsErrorBanner
            title={strings('rewards.vip_transactions.error_title')}
            description={strings('rewards.vip_transactions.error_description')}
            onConfirm={retry}
            confirmButtonLabel={strings(
              'rewards.vip_transactions.retry_button',
            )}
          />
        </Box>
      );
    }

    // Any in-flight first-page load with no rows → skeletons, never empty copy.
    if (isInitialLoadPending) {
      return (
        <Box
          twClassName="px-4 pb-2"
          testID={REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.SKELETON}
        >
          <Box twClassName="pt-4 pb-1">
            <Skeleton style={tw.style('h-3 w-24 rounded-lg')} />
          </Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <VipTransactionRowSkeleton key={i} />
          ))}
        </Box>
      );
    }

    // Settled empty list only.
    return (
      <Box twClassName="p-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.EMPTY}
        >
          {strings('rewards.vip_transactions.empty_title')}
        </Text>
      </Box>
    );
  }, [error, isInitialLoadPending, retry, tw]);

  const renderListHeader = useCallback(
    () => (
      <Pressable
        onPress={openTypeSelector}
        testID={REWARDS_VIP_TRANSACTIONS_VIEW_TEST_IDS.TYPE_SELECTOR}
      >
        <Box twClassName="px-4 py-3">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="self-start border border-border-default rounded-full px-3 py-1 gap-1"
          >
            <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
              {selectedTypeLabel}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Xs}
              color={IconColor.IconDefault}
            />
          </Box>
        </Box>
      </Pressable>
    ),
    [openTypeSelector, selectedTypeLabel],
  );

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
