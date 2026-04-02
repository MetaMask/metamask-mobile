import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import MultichainTransactionListItem from '../../../MultichainTransactionListItem';
import MOCK_MONEY_TRANSACTIONS, {
  MoneyActivityFilter,
  MoneyMockTransaction,
} from '../../constants/mockActivityData';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import {
  getMoneyActivityTextStyles,
  getMusdDisplayAmount,
  getMusdFiatAmount,
  moneyActivityItemStyles,
} from '../../constants/activityStyles';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});

interface DateSection {
  title: string;
  data: MoneyMockTransaction[];
}

function groupByDate(transactions: MoneyMockTransaction[]): DateSection[] {
  const groups = new Map<string, MoneyMockTransaction[]>();
  for (const tx of transactions) {
    const existing = groups.get(tx.date);
    if (existing) {
      existing.push(tx);
    } else {
      groups.set(tx.date, [tx]);
    }
  }
  return Array.from(groups.entries()).map(([date, data]) => ({
    title: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
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

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // eslint-disable-next-line no-alert
  const handleSearchPress = () => alert('Under construction 🚧');

  const filtered = useMemo(() => {
    if (filter === MoneyActivityFilter.All) return MOCK_MONEY_TRANSACTIONS;
    if (filter === MoneyActivityFilter.Deposits)
      return MOCK_MONEY_TRANSACTIONS.filter((tx) => tx.filter === 'deposit');
    return MOCK_MONEY_TRANSACTIONS.filter((tx) => tx.filter === 'transfer');
  }, [filter]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

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

  const renderItem = ({
    item,
    index,
  }: {
    item: MoneyMockTransaction;
    index: number;
  }) => (
    <MultichainTransactionListItem
      transaction={item.transaction}
      chainId={item.chainId}
      navigation={navigation as never}
      index={index}
      hideDate
      iconSize={40}
      badgePosition={{ bottom: -4, right: -4 }}
      description={item.description}
      tokenIconSource={MUSD_TOKEN.imageSource}
      containerStyle={moneyActivityItemStyles.container}
      hideSubtitle={!item.description}
      textStyles={getMoneyActivityTextStyles(colors, item.transaction.type)}
      displayAmountOverride={getMusdDisplayAmount(item.transaction)}
      fiatAmount={getMusdFiatAmount(item.transaction)}
      hideBorder
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
      {/* Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 pt-2 pb-1"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel="Back"
          testID={MoneyActivityViewTestIds.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          accessibilityLabel="Search"
          testID={MoneyActivityViewTestIds.SEARCH_BUTTON}
        />
      </Box>

      {/* Title */}
      <Box twClassName="px-4 pb-2">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.SemiBold}
          testID={MoneyActivityViewTestIds.TITLE}
        >
          {strings('money.activity.title')}
        </Text>
      </Box>

      {/* Filter tabs */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pb-3 gap-2">
        <Button
          variant={
            isActive(MoneyActivityFilter.All)
              ? ButtonVariant.Primary
              : ButtonVariant.Secondary
          }
          size={ButtonSize.Sm}
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
          size={ButtonSize.Sm}
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
          size={ButtonSize.Sm}
          onPress={() => setFilter(MoneyActivityFilter.Transfers)}
          testID={MoneyActivityViewTestIds.FILTER_TRANSFERS}
        >
          {strings('money.activity.filter_transfers')}
        </Button>
      </Box>

      {/* Transaction list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.transaction.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
      />
    </Box>
  );
};

export default MoneyActivityView;
