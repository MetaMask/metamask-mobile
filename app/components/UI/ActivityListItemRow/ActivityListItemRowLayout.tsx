/* eslint-disable @typescript-eslint/no-deprecated -- this row intentionally uses the legacy ListItem with legacy ListItemColumn; mixing in the new DS ListItem causes press/layout regressions */
import React from 'react';
import { Pressable, Text } from 'react-native';
import ListItem from '../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../component-library/components/List/ListItemColumn';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../util/activity-adapters';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';

export function ActivityListItemRowLayout({
  avatar,
  index,
  isFailed,
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
  item: ActivityListItem;
  onPress?: () => void;
  primaryAmount?: string;
  primaryToken?: TokenAmount;
  secondaryAmount?: string;
  styles: ActivityListItemRowStyles;
  subtitle?: string;
  title: string;
}) {
  const testIdSuffix = item.data.hash ?? index;
  const titleNode = (
    <Text
      numberOfLines={1}
      style={[styles.listItemTitle, isFailed && styles.listItemTitleFailed]}
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
      <ListItemColumn widthType={WidthType.Auto} style={styles.listItemAmounts}>
        {primaryAmountNode}
        {secondaryAmountNode}
      </ListItemColumn>
    ) : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}
      testID={`activity-item-${index ?? 0}`}
    >
      <ListItem style={styles.listItem}>
        <ListItemColumn widthType={WidthType.Auto}>{avatar}</ListItemColumn>
        <ListItemColumn widthType={WidthType.Fill}>
          {titleNode}
          {subtitleNode}
        </ListItemColumn>
        {amountColumn}
      </ListItem>
    </Pressable>
  );
}
