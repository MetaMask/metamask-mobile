import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  SectionList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { type TransactionMeta } from '@metamask/transaction-controller';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonFilter,
  ButtonIconSize,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import MoneyActivityRow from '../../components/MoneyActivityRow/MoneyActivityRow';
import MoneyActivityLoading from '../../components/MoneyActivityLoading/MoneyActivityLoading';
import { useMoneyActivityItems } from '../../hooks/useMoneyActivityItems';
import { type MoneyActivityItem } from '../../types/moneyActivity';
import { MoneyActivityFilter } from '../../constants/mockActivityData';
import { getMoneyActivityStatus } from '../../utils/classifyMoneyActivity';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';
import useMountEffect from '../../hooks/useMountEffect';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { partition } from 'lodash';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  filterScroll: { flexGrow: 0 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

// Pull roughly a screenful into the active bucket upfront so the list is tall
// enough for scroll-driven pagination (`onEndReached`) to take over — a
// short, unscrollable list can never trigger `onEndReached` on its own.
export const INITIAL_FILL_COUNT = 15;

const FILTER_LABEL_KEYS = {
  all: 'money.activity.filter_all',
  deposits: 'money.activity.filter_deposits',
  transfers: 'money.activity.filter_sends',
  purchases: 'money.activity.filter_purchases',
} as const;

interface ActivitySection {
  title: string;
  data: MoneyActivityItem[];
  /** Marks the in-flight bucket so its header renders distinctly from dates. */
  isPending?: boolean;
}

/** True for an in-flight on-chain row. Card spends are never pending. */
function isPendingItem(item: MoneyActivityItem): boolean {
  return (
    item.kind === 'onchain' && getMoneyActivityStatus(item.tx) === 'pending'
  );
}

function dateKeyUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

// Headers are pinned to en-US per the Money design spec ("Jan 26, 2026") and
// rendered in UTC so the label always names the same day the row was bucketed
// under by `dateKeyUtc`.
const dateHeaderFormatter = getIntlDateTimeFormatter('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function groupByDate(items: MoneyActivityItem[]): ActivitySection[] {
  const groups = new Map<string, MoneyActivityItem[]>();
  for (const item of items) {
    const key = dateKeyUtc(item.time);
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.entries()).map(([dateKey, data]) => ({
    title: dateHeaderFormatter.format(new Date(`${dateKey}T00:00:00.000Z`)),
    data,
  }));
}

/**
 * Builds the list sections: a single "Pending" bucket (in-flight rows) on top,
 * followed by the confirmed/failed rows grouped by date.
 */
function buildSections(items: MoneyActivityItem[]): ActivitySection[] {
  const [pending, settled] = partition(items, isPendingItem);

  const dateSections = groupByDate(settled);
  if (pending.length === 0) {
    return dateSections;
  }
  return [
    {
      title: strings('money.activity.pending'),
      data: pending,
      isPending: true,
    },
    ...dateSections,
  ];
}

const MoneyActivityView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );
  const [filter, setFilter] = useState(MoneyActivityFilter.All);
  const { trackScreenViewed, trackActivitySurfaceClicked, trackButtonClicked } =
    useMoneyAnalytics({
      screen_name: SCREEN_NAMES.MONEY_ACTIVITY,
    });

  useMountEffect(trackScreenViewed);

  const {
    buckets,
    loadMore,
    hasMore,
    isLoadingMore,
    isSettling,
    error,
    refetch,
    moneyAddress,
    mockDataEnabled,
  } = useMoneyActivityItems({
    // Auto-fill the active tab's bucket to a screenful; switching tabs
    // re-evaluates for the new bucket.
    fill: { bucket: filter, count: INITIAL_FILL_COUNT },
  });

  const handleFilterPress = useCallback(
    (
      filterClicked: MoneyActivityFilter,
      labelKey: string,
      componentName: COMPONENT_NAMES,
    ) => {
      trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.FILTER,
        label_key: labelKey,
        component_name: componentName,
      });

      setFilter(filterClicked);
    },
    [trackButtonClicked],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleItemPress = useCallback(
    (transaction: TransactionMeta) => {
      trackActivitySurfaceClicked({
        transaction,
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
        component_name: COMPONENT_NAMES.MONEY_ACTIVITY_LIST_ITEM,
      });

      navigation.navigate(Routes.MONEY.TRANSACTION_DETAILS, {
        transactionId: transaction.id,
      });
    },
    [navigation, trackActivitySurfaceClicked],
  );

  const filtered = buckets[filter];

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  const renderSectionHeader = ({ section }: { section: ActivitySection }) => (
    <Box twClassName="px-4 pt-2 pb-1 bg-default">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        testID={
          section.isPending
            ? MoneyActivityViewTestIds.PENDING_HEADER
            : MoneyActivityViewTestIds.DATE_HEADER
        }
      >
        {section.title}
      </Text>
    </Box>
  );

  const isRowPressEnabled = !mockDataEnabled && activityDetailsEnabled;

  const renderItem = useCallback(
    ({ item }: { item: MoneyActivityItem }) => (
      <MoneyActivityRow
        item={item}
        moneyAddress={moneyAddress}
        onPress={isRowPressEnabled ? handleItemPress : undefined}
        privacyMode={privacyMode}
      />
    ),
    [moneyAddress, isRowPressEnabled, handleItemPress, privacyMode],
  );

  // Pages are shared across all three tabs (one cursor stream), so reaching the
  // end of any rendered bucket pulls the next page for all of them. The
  // `isLoadingMore` guard stops momentum-scroll bursts from cancelling and
  // re-issuing the in-flight fetch.
  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // A failed fetch is terminal (no automatic retries), so surface it: older
  // pages exist but won't arrive on their own. Retry replays the query.
  const listFooter = error ? (
    <Box
      paddingVertical={4}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2"
      testID={MoneyActivityViewTestIds.LOAD_ERROR}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('money.activity.load_error_more')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={refetch}
        testID={MoneyActivityViewTestIds.RETRY_BUTTON}
      >
        {strings('money.activity.retry')}
      </Button>
    </Box>
  ) : isLoadingMore ? (
    <Box
      paddingVertical={4}
      testID={MoneyActivityViewTestIds.LOAD_MORE_SPINNER}
    >
      <ActivityIndicator color={colors.icon.alternative} />
    </Box>
  ) : null;

  const isActive = (f: MoneyActivityFilter) => f === filter;

  return (
    <Box
      style={[
        styles.safeArea,
        { paddingTop: insets.top, backgroundColor: colors.background.default },
      ]}
      twClassName="flex-1 bg-default"
      testID={MoneyActivityViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Start}
        paddingVertical={2}
        twClassName="px-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel="Back"
          testID={MoneyActivityViewTestIds.BACK_BUTTON}
        />
      </Box>

      <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4}>
        <Text
          variant={TextVariant.HeadingLg}
          testID={MoneyActivityViewTestIds.TITLE}
        >
          {strings('money.activity.title')}
        </Text>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <ButtonFilter
          isActive={isActive(MoneyActivityFilter.All)}
          size={ButtonBaseSize.Md}
          onPress={() =>
            handleFilterPress(
              MoneyActivityFilter.All,
              FILTER_LABEL_KEYS.all,
              COMPONENT_NAMES.MONEY_ACTIVITY_FILTER_ALL,
            )
          }
          testID={MoneyActivityViewTestIds.FILTER_ALL}
        >
          {strings(FILTER_LABEL_KEYS.all)}
        </ButtonFilter>
        <ButtonFilter
          isActive={isActive(MoneyActivityFilter.Deposits)}
          size={ButtonBaseSize.Md}
          onPress={() =>
            handleFilterPress(
              MoneyActivityFilter.Deposits,
              FILTER_LABEL_KEYS.deposits,
              COMPONENT_NAMES.MONEY_ACTIVITY_FILTER_DEPOSITS,
            )
          }
          testID={MoneyActivityViewTestIds.FILTER_DEPOSITS}
        >
          {strings(FILTER_LABEL_KEYS.deposits)}
        </ButtonFilter>
        <ButtonFilter
          isActive={isActive(MoneyActivityFilter.Transfers)}
          size={ButtonBaseSize.Md}
          onPress={() =>
            handleFilterPress(
              MoneyActivityFilter.Transfers,
              FILTER_LABEL_KEYS.transfers,
              COMPONENT_NAMES.MONEY_ACTIVITY_FILTER_TRANSFERS,
            )
          }
          testID={MoneyActivityViewTestIds.FILTER_TRANSFERS}
        >
          {strings(FILTER_LABEL_KEYS.transfers)}
        </ButtonFilter>
        <ButtonFilter
          isActive={isActive(MoneyActivityFilter.Purchases)}
          size={ButtonBaseSize.Md}
          onPress={() =>
            handleFilterPress(
              MoneyActivityFilter.Purchases,
              FILTER_LABEL_KEYS.purchases,
              COMPONENT_NAMES.MONEY_ACTIVITY_FILTER_PURCHASES,
            )
          }
          testID={MoneyActivityViewTestIds.FILTER_PURCHASES}
        >
          {strings(FILTER_LABEL_KEYS.purchases)}
        </ButtonFilter>
      </ScrollView>

      {isSettling ? (
        // Keep the skeleton up while the bucket is empty but the fill loop is
        // still fetching — otherwise an in-flight fetch would flash "No
        // activity". The hook settles the moment fetching stops, including
        // when the page budget is spent or the query errors.
        <MoneyActivityLoading />
      ) : sections.length === 0 ? (
        <Box
          twClassName="flex-1 items-center justify-center px-6 pb-32"
          testID={MoneyActivityViewTestIds.EMPTY_LIST}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE}
          >
            {strings(
              // "No activity" must mean verified-empty, never failed-to-load.
              error ? 'money.activity.load_error' : 'money.activity.empty',
            )}
          </Text>
          {error ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="mt-4"
              onPress={refetch}
              testID={MoneyActivityViewTestIds.RETRY_BUTTON}
            >
              {strings('money.activity.retry')}
            </Button>
          ) : null}
        </Box>
      ) : (
        <SectionList
          testID={MoneyActivityViewTestIds.LIST}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={listFooter}
        />
      )}
    </Box>
  );
};

export default MoneyActivityView;
