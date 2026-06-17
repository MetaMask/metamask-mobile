import React from 'react';
import { Text, View } from 'react-native';
import { ListItem } from '@metamask/design-system-react-native';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../util/activity-adapters';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';

export function ActivityListItemRowLayout({
  avatar,
  index,
  isFailed,
  titleSeverity,
  item,
  onPress,
  primaryAmount,
  primaryToken,
  secondaryAmount,
  styles,
  subtitle,
  title,
}: {
  avatar: React.ReactNode;
  index?: number;
  isFailed: boolean;
  titleSeverity?: 'error' | 'warning';
  item: ActivityListItem;
  onPress?: () => void;
  primaryAmount?: string;
  primaryToken?: TokenAmount;
  secondaryAmount?: string;
  styles: ActivityListItemRowStyles;
  subtitle?: string;
  title: string;
}) {
  const testIdSuffix = item.hash ?? index;
  const titleSeverityStyle =
    isFailed || titleSeverity === 'error'
      ? styles.listItemTitleFailed
      : titleSeverity === 'warning'
        ? styles.listItemTitleWarning
        : undefined;
  const titleNode = (
    <Text
      numberOfLines={1}
      style={[styles.listItemTitle, titleSeverityStyle]}
      testID={`activity-title-${testIdSuffix}`}
    >
      {title}
    </Text>
  );
  const subtitleNode = subtitle ? (
    <Text
      numberOfLines={1}
      style={styles.subtitleText}
      testID={`activity-subtitle-${testIdSuffix}`}
    >
      {subtitle}
    </Text>
  ) : undefined;
  const primaryAmountNode = primaryAmount ? (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[
        styles.listItemAmount,
        primaryToken?.direction === 'in' && styles.listItemAmountIncoming,
      ]}
      testID={`activity-primary-amount-${testIdSuffix}`}
    >
      {primaryAmount}
    </Text>
  ) : undefined;
  const secondaryAmountNode = secondaryAmount ? (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={styles.listItemSecondaryAmount}
      testID={`activity-secondary-amount-${testIdSuffix}`}
    >
      {secondaryAmount}
    </Text>
  ) : undefined;
  const amountColumn =
    primaryAmountNode || secondaryAmountNode ? (
      <View style={styles.listItemAmounts}>
        {primaryAmountNode}
        {secondaryAmountNode}
      </View>
    ) : undefined;

  return (
    <ListItem
      isInteractive
      avatar={avatar}
      description={subtitleNode}
      endAccessory={amountColumn}
      onPress={onPress}
      style={[styles.row, styles.listItem]}
      testID={`transaction-item-${index ?? 0}`}
      title={titleNode}
      verticalAlignment="top"
    />
  );
}
