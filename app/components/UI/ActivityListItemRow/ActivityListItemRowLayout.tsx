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
  footer,
  index,
  isFailed,
  item,
  onPress,
  primaryAmount,
  primaryToken,
  secondaryAmount,
  styles,
  subtitle,
  subtitleLeadingAccessory,
  title,
  titleAccessory,
}: {
  avatar: React.ReactNode;
  footer?: React.ReactNode;
  index?: number;
  isFailed: boolean;
  item: ActivityListItem;
  onPress?: () => void;
  primaryAmount?: string;
  primaryToken?: TokenAmount;
  secondaryAmount?: string;
  styles: ActivityListItemRowStyles;
  subtitle?: string;
  subtitleLeadingAccessory?: React.ReactNode;
  title: string;
  titleAccessory?: React.ReactNode;
}) {
  const testIdSuffix = item.hash ?? index;
  const titleText = (
    <Text
      numberOfLines={1}
      style={[styles.listItemTitle, isFailed && styles.listItemTitleFailed]}
      testID={`activity-title-${testIdSuffix}`}
    >
      {title}
    </Text>
  );
  const titleNode = titleAccessory ? (
    <View style={styles.titleRow}>
      {titleText}
      {titleAccessory}
    </View>
  ) : (
    titleText
  );
  const subtitleNode = subtitle ? (
    subtitleLeadingAccessory ? (
      <View style={styles.subtitleRow}>
        {subtitleLeadingAccessory}
        <Text
          numberOfLines={1}
          style={styles.subtitleText}
          testID={`activity-subtitle-${testIdSuffix}`}
        >
          {subtitle}
        </Text>
      </View>
    ) : (
      <Text
        numberOfLines={1}
        style={styles.subtitleText}
        testID={`activity-subtitle-${testIdSuffix}`}
      >
        {subtitle}
      </Text>
    )
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
    <View style={styles.row}>
      <ListItem
        isInteractive
        avatar={avatar}
        description={subtitleNode}
        endAccessory={amountColumn}
        onPress={onPress}
        style={styles.listItem}
        testID={`transaction-item-${index ?? 0}`}
        title={titleNode}
        accessoryGap={4}
      />
      {footer}
    </View>
  );
}
