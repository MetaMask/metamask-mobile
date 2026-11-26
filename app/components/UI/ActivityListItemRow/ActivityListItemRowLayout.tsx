import React from 'react';
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
import { View } from '../primitives/View';

function resolveTitleColor(
  isFailed: boolean,
  titleSeverity?: 'error' | 'warning',
) {
  if (isFailed || titleSeverity === 'error') {
    return TextColor.ErrorDefault;
  }
  if (titleSeverity === 'warning') {
    return TextColor.WarningDefault;
  }
  return TextColor.TextDefault;
}

function resolvePrimaryAmountColor({
  primaryToken,
  amountIsPnl,
  amountIsMuted,
}: {
  primaryToken?: TokenAmount;
  amountIsPnl?: boolean;
  amountIsMuted?: boolean;
}) {
  if (amountIsMuted) {
    return TextColor.TextMuted;
  }
  if (amountIsPnl && primaryToken?.direction === 'out') {
    return TextColor.ErrorDefault;
  }
  if (primaryToken?.direction === 'in') {
    return TextColor.SuccessDefault;
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
  amountIsPnl,
  amountIsMuted,
  secondaryAmount,
  subtitle,
  subtitleLeadingAccessory,
  subtitleParts,
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
  amountIsPnl?: boolean;
  amountIsMuted?: boolean;
  secondaryAmount?: string;
  subtitle?: string;
  subtitleLeadingAccessory?: React.ReactNode;
  subtitleParts?: { pre: string; avatar: React.ReactNode; name: string };
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
      className="min-w-0 shrink"
      testID={`activity-title-${testIdSuffix}`}
    >
      {title}
    </Text>
  );
  const titleNode = titleAccessory ? (
    <View className="min-w-0 shrink flex-row items-center">
      {titleText}
      {titleAccessory}
    </View>
  ) : (
    titleText
  );
  const subtitleText = subtitle ? (
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      numberOfLines={1}
      testID={`activity-subtitle-${testIdSuffix}`}
    >
      {subtitle}
    </Text>
  ) : undefined;
  const subtitleNode = subtitleParts ? (
    <View className="flex-row items-center">
      {subtitleLeadingAccessory}
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        testID={`activity-subtitle-${testIdSuffix}`}
      >
        {subtitleParts.pre}
      </Text>
      {subtitleParts.avatar}
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        className="shrink"
        testID={`activity-subtitle-account-name-${testIdSuffix}`}
      >
        {subtitleParts.name}
      </Text>
    </View>
  ) : subtitleText && subtitleLeadingAccessory ? (
    <View className="flex-row items-center">
      {subtitleLeadingAccessory}
      {subtitleText}
    </View>
  ) : (
    subtitleText
  );
  const primaryAmountNode = primaryAmount ? (
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={resolvePrimaryAmountColor({
        primaryToken,
        amountIsPnl,
        amountIsMuted,
      })}
      numberOfLines={1}
      ellipsizeMode="tail"
      className="text-right"
      testID={`activity-primary-amount-${testIdSuffix}`}
    >
      {primaryAmount}
    </Text>
  ) : undefined;
  const secondaryAmountNode = secondaryAmount ? (
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      numberOfLines={1}
      ellipsizeMode="tail"
      className="text-right"
      testID={`activity-secondary-amount-${testIdSuffix}`}
    >
      {secondaryAmount}
    </Text>
  ) : undefined;
  const amountColumn =
    primaryAmountNode || secondaryAmountNode ? (
      <View
        className="min-w-0 max-w-[45%] shrink-0 items-end"
        testID={`activity-amount-column-${testIdSuffix}`}
      >
        {primaryAmountNode}
        {secondaryAmountNode}
      </View>
    ) : undefined;

  return (
    <View className="w-full flex-1 self-stretch bg-default">
      <ListItem
        isInteractive
        avatar={avatar}
        description={subtitleNode}
        endAccessory={amountColumn}
        onPress={onPress}
        className="min-h-16 py-2"
        testID={`transaction-item-${index ?? 0}`}
        title={titleNode}
        accessoryGap={4}
      />
      {footer}
    </View>
  );
}
