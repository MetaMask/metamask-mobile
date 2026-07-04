import React from 'react';
import { View } from 'react-native';
import {
  FontWeight,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../util/activity-adapters';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';

function resolveTitleColor(
  isFailed: boolean,
  titleSeverity?: 'error' | 'warning',
): (typeof TextColor)[keyof typeof TextColor] {
  if (isFailed || titleSeverity === 'error') {
    return TextColor.ErrorDefault;
  }

  if (titleSeverity === 'warning') {
    return TextColor.WarningDefault;
  }

  return TextColor.TextDefault;
}

export function ActivityListItemRowLayout({
  avatar,
  footer,
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
  subtitleLeadingAccessory,
  title,
  titleAccessory,
}: {
  avatar: React.ReactNode;
  footer?: React.ReactNode;
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
  subtitleLeadingAccessory?: React.ReactNode;
  title: string;
  titleAccessory?: React.ReactNode;
}) {
  const testIdSuffix = item.hash ?? index;
  const titleText = (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={resolveTitleColor(isFailed, titleSeverity)}
      numberOfLines={1}
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
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={`activity-subtitle-${testIdSuffix}`}
        >
          {subtitle}
        </Text>
      </View>
    ) : (
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        testID={`activity-subtitle-${testIdSuffix}`}
      >
        {subtitle}
      </Text>
    )
  ) : undefined;
  const primaryAmountNode = primaryAmount ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={
        primaryToken?.direction === 'in'
          ? TextColor.SuccessDefault
          : TextColor.TextDefault
      }
      twClassName="text-right"
      numberOfLines={1}
      ellipsizeMode="tail"
      testID={`activity-primary-amount-${testIdSuffix}`}
    >
      {primaryAmount}
    </Text>
  ) : undefined;
  const secondaryAmountNode = secondaryAmount ? (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      twClassName="text-right"
      numberOfLines={1}
      ellipsizeMode="tail"
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
