import React from 'react';
import { Text, TouchableHighlight } from 'react-native';
import ListItem from '../../Base/ListItem';
import { useTheme } from '../../../util/theme';
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
  const { colors } = useTheme();
  const testIdSuffix = item.data.hash ?? index;

  return (
    <TouchableHighlight
      style={styles.row}
      onPress={onPress}
      underlayColor={colors.background.alternative}
      activeOpacity={1}
      testID={`activity-item-${index ?? 0}`}
    >
      <ListItem style={styles.listItem}>
        <ListItem.Content style={styles.listItemContent}>
          <ListItem.Icon>{avatar}</ListItem.Icon>
          <ListItem.Body style={styles.listItemBody}>
            <ListItem.Title
              numberOfLines={1}
              style={[
                styles.listItemTitle,
                isFailed && styles.listItemTitleFailed,
              ]}
              testID={`activity-title-${testIdSuffix}`}
            >
              {title}
            </ListItem.Title>
            {subtitle && (
              <Text
                numberOfLines={1}
                style={styles.subtitleText}
                testID={`activity-subtitle-${testIdSuffix}`}
              >
                {subtitle}
              </Text>
            )}
          </ListItem.Body>
          {Boolean(primaryAmount || secondaryAmount) && (
            <ListItem.Amounts style={styles.listItemAmounts}>
              {Boolean(primaryAmount) && (
                <ListItem.Amount
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.listItemAmount,
                    primaryToken?.direction === 'in' &&
                      styles.listItemAmountIncoming,
                  ]}
                  testID={`activity-primary-amount-${testIdSuffix}`}
                >
                  {primaryAmount}
                </ListItem.Amount>
              )}
              {Boolean(secondaryAmount) && (
                <ListItem.FiatAmount
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={styles.listItemSecondaryAmount}
                  testID={`activity-secondary-amount-${testIdSuffix}`}
                >
                  {secondaryAmount}
                </ListItem.FiatAmount>
              )}
            </ListItem.Amounts>
          )}
        </ListItem.Content>
      </ListItem>
    </TouchableHighlight>
  );
}
