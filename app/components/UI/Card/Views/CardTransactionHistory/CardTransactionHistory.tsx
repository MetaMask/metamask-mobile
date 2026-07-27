import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextFieldSearch,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CardTransaction } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useCardTransactions } from '../../hooks/useCardTransactions';
import type { CardScreensStackParamList } from '../../types/navigation';
import { formatCardTransactionDate } from '../../utils/cardTransactionDisplayInfo';
import CardTransactionRow from '../../components/CardTransactionRow/CardTransactionRow';

interface TransactionSection {
  title: string;
  data: CardTransaction[];
}

function dateKeyLocal(time: number): string {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function groupTransactionsByDate(
  transactions: CardTransaction[],
): TransactionSection[] {
  const groups = new Map<string, CardTransaction[]>();

  for (const transaction of transactions) {
    const key = dateKeyLocal(transaction.timestamp);
    const existing = groups.get(key);
    if (existing) {
      existing.push(transaction);
    } else {
      groups.set(key, [transaction]);
    }
  }

  return Array.from(groups.entries()).map(([, data]) => ({
    title: formatCardTransactionDate(data[0]?.timestamp ?? Date.now()),
    data,
  }));
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});

const CardTransactionHistory = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<CardScreensStackParamList>>();
  const insets = useSafeAreaInsets();
  const tw = useTailwind();
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
  const headerHandlers = useCardHeaderHandlers('back');
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedOpen = useRef(false);
  const hasTrackedSearch = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    items,
    hasMore,
    loadMore,
    isLoadingMore,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useCardTransactions({ searchQuery });

  const sections = useMemo(() => groupTransactionsByDate(items), [items]);

  useEffect(() => {
    if (hasTrackedOpen.current) {
      return;
    }
    hasTrackedOpen.current = true;
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_TRANSACTION_HISTORY_OPENED,
      ).build(),
    );
  }, [createEventBuilder, trackEvent]);

  useEffect(() => {
    if (!searchQuery.trim() || hasTrackedSearch.current) {
      return;
    }
    hasTrackedSearch.current = true;
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_TRANSACTION_SEARCH_USED,
      ).build(),
    );
  }, [createEventBuilder, searchQuery, trackEvent]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTransactionPress = useCallback(
    (transaction: CardTransaction) => {
      navigation.navigate(Routes.CARD.TRANSACTION_DETAILS, {
        transactionId: transaction.id,
        transaction,
      });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const listFooter = error ? (
    <Box twClassName="items-center gap-2 py-4">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('card.transactions.load_error_more')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={handleRefresh}
      >
        {strings('card.transactions.retry')}
      </Button>
    </Box>
  ) : isLoadingMore ? (
    <Box twClassName="py-4">
      <ActivityIndicator color={colors.icon.alternative} />
    </Box>
  ) : !hasMore && items.length > 0 ? (
    <Box twClassName="items-center py-4">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('card.transactions.end_of_list')}
      </Text>
    </Box>
  ) : null;

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <Box twClassName="flex-1 items-center justify-center py-12">
          <ActivityIndicator color={colors.icon.alternative} />
        </Box>
      );
    }

    if (error) {
      return (
        <Box twClassName="flex-1 items-center justify-center gap-3 px-8 py-12">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('card.transactions.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={handleRefresh}
          >
            {strings('card.transactions.retry')}
          </Button>
        </Box>
      );
    }

    return (
      <Box twClassName="flex-1 items-center justify-center px-8 py-12">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('card.transactions.empty')}
        </Text>
      </Box>
    );
  };

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="flex-1 bg-background-default"
    >
      <HeaderStandard
        title={strings('card.transactions.title')}
        includesTopInset={false}
        twClassName="bg-background-default"
        onBack={headerHandlers.onBack}
      />

      <Box twClassName="px-4 pb-3">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          onPressClearButton={() => setSearchQuery('')}
          placeholder={strings('card.transactions.search_placeholder')}
          inputProps={{ testID: 'card-transaction-history-search' }}
        />
      </Box>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Box twClassName="bg-background-default px-4 pb-1 pt-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {section.title}
            </Text>
          </Box>
        )}
        renderItem={({ item }) => (
          <CardTransactionRow
            transaction={item}
            onPress={handleTransactionPress}
            privacyMode={privacyMode}
          />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={listFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoadingMore}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={tw.style(
          items.length === 0 ? 'flex-grow' : undefined,
        )}
      />
    </Box>
  );
};

export default CardTransactionHistory;
