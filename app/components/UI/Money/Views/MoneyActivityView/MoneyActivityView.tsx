import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIconSize,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import MoneyActivityItem from '../../components/MoneyActivityItem';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { getMoneyActivityDateKeyUtc } from '../../constants/moneyActivityFilters';
import { MoneyActivityFilter } from '../../constants/mockActivityData';
import { showMoneyActivityUnderConstructionAlert } from '../../constants/showMoneyActivityUnderConstructionAlert';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  filterButtonSpacing: {
    minWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
});

interface DateSection {
  title: string;
  data: TransactionMeta[];
}

function groupByDate(
  transactions: TransactionMeta[],
  locale: string,
): DateSection[] {
  const groups = new Map<string, TransactionMeta[]>();
  for (const tx of transactions) {
    const key = getMoneyActivityDateKeyUtc(tx);
    const existing = groups.get(key);
    if (existing) {
      existing.push(tx);
    } else {
      groups.set(key, [tx]);
    }
  }
  return Array.from(groups.entries()).map(([dateKey, data]) => ({
    title: new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    data,
  }));
}

const MoneyActivityView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [filter, setFilter] = useState(MoneyActivityFilter.All);

  const { allTransactions, deposits, transfers, moneyAddress } =
    useMoneyAccountTransactions();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleItemPress = useCallback(() => {
    showMoneyActivityUnderConstructionAlert();
  }, []);

  const filtered = useMemo(() => {
    if (filter === MoneyActivityFilter.All) {
      return allTransactions;
    }
    if (filter === MoneyActivityFilter.Deposits) {
      return deposits;
    }
    return transfers;
  }, [filter, allTransactions, deposits, transfers]);

  const sections = useMemo(
    () => groupByDate(filtered, I18n.locale),
    [filtered],
  );

  const renderSectionHeader = ({ section }: { section: DateSection }) => (
    <Box twClassName="px-4 pt-2 pb-1 bg-default">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={MoneyActivityViewTestIds.DATE_HEADER}
      >
        {section.title}
      </Text>
    </Box>
  );

  const renderItem = ({ item }: { item: TransactionMeta }) => (
    <MoneyActivityItem
      tx={item}
      moneyAddress={moneyAddress}
      onPress={handleItemPress}
    />
  );

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
        paddingHorizontal={1}
        paddingVertical={2}
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel="Back"
          testID={MoneyActivityViewTestIds.BACK_BUTTON}
        />
      </Box>

      <Box paddingHorizontal={4} paddingTop={4} paddingBottom={6}>
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Medium}
          testID={MoneyActivityViewTestIds.TITLE}
        >
          {strings('money.activity.title')}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        gap={4}
        paddingHorizontal={4}
        paddingBottom={3}
      >
        <Button
          variant={
            isActive(MoneyActivityFilter.All)
              ? ButtonVariant.Primary
              : ButtonVariant.Secondary
          }
          size={ButtonSize.Md}
          style={styles.filterButtonSpacing}
          onPress={() => setFilter(MoneyActivityFilter.All)}
          testID={MoneyActivityViewTestIds.FILTER_ALL}
        >
          {strings('money.activity.filter_all')}
        </Button>
        <Button
          variant={
            isActive(MoneyActivityFilter.Deposits)
              ? ButtonVariant.Primary
              : ButtonVariant.Secondary
          }
          size={ButtonSize.Md}
          style={styles.filterButtonSpacing}
          onPress={() => setFilter(MoneyActivityFilter.Deposits)}
          testID={MoneyActivityViewTestIds.FILTER_DEPOSITS}
        >
          {strings('money.activity.filter_deposits')}
        </Button>
        <Button
          variant={
            isActive(MoneyActivityFilter.Transfers)
              ? ButtonVariant.Primary
              : ButtonVariant.Secondary
          }
          size={ButtonSize.Md}
          style={styles.filterButtonSpacing}
          onPress={() => setFilter(MoneyActivityFilter.Transfers)}
          testID={MoneyActivityViewTestIds.FILTER_TRANSFERS}
        >
          {strings('money.activity.filter_transfers')}
        </Button>
      </Box>

      {sections.length === 0 ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-6 pb-8"
          testID={MoneyActivityViewTestIds.EMPTY_LIST}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE}
          >
            {strings('money.activity.empty')}
          </Text>
        </Box>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
        />
      )}
    </Box>
  );
};

export default MoneyActivityView;
