import React, { useMemo } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Spinner,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CardTransaction } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { strings } from '../../../../../../../locales/i18n';
import { cardTransactionDisplayInfo } from '../../../utils/cardTransactionDisplayInfo';
import { CARD_RECENT_TRANSACTIONS_LIMIT } from '../../../hooks/useCardRecentTransactions';
import { CardHomeSelectors } from '../CardHome.testIds';

interface CardHomeRecentActivityProps {
  transactions: CardTransaction[];
  /** True while the first page has not arrived. An empty list is not loading. */
  isLoading?: boolean;
  /** True when the first page failed. Distinct from an empty history. */
  hasError?: boolean;
  onRetry?: () => void;
  /**
   * Opens the full Transaction history (same destination as the old row).
   * When absent (no history destination), See all is hidden.
   */
  onSeeAll?: () => void;
  onTransactionPress?: (transaction: CardTransaction) => void;
  privacyMode?: boolean;
}

/** Same 40pt muted circle as the Manage rows, so the first row lines up. */
const ActivityRowIcon = ({ name }: { name: IconName }) => (
  <Box className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
    <Icon name={name} size={IconSize.Md} color={IconColor.IconDefault} />
  </Box>
);

interface ActivityListItemProps {
  transaction: CardTransaction;
  onPress?: (transaction: CardTransaction) => void;
  privacyMode?: boolean;
}

const ActivityListItem = ({
  transaction,
  onPress,
  privacyMode = false,
}: ActivityListItemProps) => {
  const display = useMemo(
    () => cardTransactionDisplayInfo(transaction),
    [transaction],
  );

  const isFailed = display.status === 'failed';
  const isPending = display.status === 'pending';
  const amountColor = isFailed
    ? TextColor.TextAlternative
    : display.isIncoming
      ? TextColor.SuccessDefault
      : TextColor.TextDefault;

  const title = isFailed ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.ErrorDefault}
      numberOfLines={1}
    >
      {display.label}
    </Text>
  ) : (
    display.label
  );

  const primaryAmount = display.showPrimaryAmount ? (
    <SensitiveText
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={amountColor}
      isHidden={privacyMode}
      length={SensitiveTextLength.Short}
      className="text-right"
    >
      {display.primaryAmount}
    </SensitiveText>
  ) : undefined;

  const secondaryLabel = isPending
    ? strings('card.transactions.pending')
    : display.fiatAmount;
  const subvalue = secondaryLabel ? (
    <SensitiveText
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={
        isPending
          ? TextColor.TextAlternative
          : display.isFiatAmountMuted
            ? TextColor.TextAlternative
            : amountColor
      }
      isHidden={privacyMode && !isPending}
      length={SensitiveTextLength.Short}
      className="text-right"
    >
      {secondaryLabel}
    </SensitiveText>
  ) : undefined;

  return (
    <ListItem
      isInteractive={Boolean(onPress)}
      variant={ListItemVariant.TwoLines}
      accessoryGap={4}
      title={title}
      description={display.description}
      value={primaryAmount}
      subvalue={subvalue}
      startAccessory={<ActivityRowIcon name={display.icon} />}
      onPress={onPress ? () => onPress(transaction) : undefined}
      testID={`${CardHomeSelectors.RECENT_ACTIVITY_ROW_PREFIX}${transaction.id}`}
    />
  );
};

/**
 * Card home Activity segment: the latest card transactions as MMDS
 * `ListItem` rows (same padding, 40pt leading icon and top spacing as
 * the Manage rows), plus a "See all" button that opens the full history.
 * There is no section title — the segment label already names this list.
 * With no transactions it shows a top-aligned MMDS TabEmptyState so the
 * segment control does not jump when switching to Manage. A first fetch
 * still in flight, or one that failed, is not that empty state.
 */
const CardHomeRecentActivity = ({
  transactions,
  isLoading = false,
  hasError = false,
  onRetry,
  onSeeAll,
  onTransactionPress,
  privacyMode,
}: CardHomeRecentActivityProps) => {
  const recent = transactions.slice(0, CARD_RECENT_TRANSACTIONS_LIMIT);
  const hasTransactions = recent.length > 0;
  // A destination is enough: an empty or failed feed still opens full history.
  const seeAllButton = onSeeAll ? (
    <Box className={hasTransactions ? 'px-4 pt-2 pb-2' : 'w-full pt-2 pb-2'}>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        isFullWidth
        onPress={onSeeAll}
        testID={CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL}
      >
        {strings('card.card_home.recent_activity.see_all')}
      </Button>
    </Box>
  ) : null;

  if (!hasTransactions && isLoading) {
    return (
      <Box
        testID={CardHomeSelectors.RECENT_ACTIVITY}
        className="items-center px-4 pt-6"
      >
        <Box testID={CardHomeSelectors.RECENT_ACTIVITY_LOADING}>
          <Spinner spinnerIconProps={{ size: IconSize.Xl }} />
        </Box>
      </Box>
    );
  }

  if (!hasTransactions && hasError) {
    return (
      <Box
        testID={CardHomeSelectors.RECENT_ACTIVITY}
        className="items-center px-4 pt-6"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          className="text-center"
          testID={CardHomeSelectors.RECENT_ACTIVITY_ERROR}
        >
          {strings('card.transactions.load_error')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={onRetry}
          className="mt-3 self-center"
          testID={CardHomeSelectors.RECENT_ACTIVITY_RETRY}
        >
          {strings('card.transactions.retry')}
        </Button>
        {seeAllButton}
      </Box>
    );
  }

  return (
    <Box testID={CardHomeSelectors.RECENT_ACTIVITY}>
      {hasTransactions ? (
        <>
          {recent.map((transaction) => (
            <ActivityListItem
              key={transaction.id}
              transaction={transaction}
              onPress={onTransactionPress}
              privacyMode={privacyMode}
            />
          ))}
          {seeAllButton}
        </>
      ) : (
        <Box
          className="items-center px-4 pt-6"
          testID={CardHomeSelectors.RECENT_ACTIVITY_EMPTY}
        >
          <TabEmptyState
            icon={
              <Icon
                name={IconName.Card}
                size={IconSize.Xl}
                color={IconColor.IconMuted}
              />
            }
            description={strings('card.card_home.activity_empty_title')}
            descriptionProps={{ color: TextColor.TextDefault }}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              className="text-center"
            >
              {strings('card.card_home.activity_empty_description')}
            </Text>
          </TabEmptyState>
          {seeAllButton}
        </Box>
      )}
    </Box>
  );
};

export default CardHomeRecentActivity;
