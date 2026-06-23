/**
 * Pending variant of the activity row. Reuses the shared row content/layout,
 * shows a spinner beside the title for in-flight txs, and prefixes queued txs
 * with an hourglass indicator while keeping the normal address subtitle.
 */
import React, { useCallback } from 'react';
import { View, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { getNetworkImageSource } from '../../../util/networks';
import { RootState } from '../../../reducers';
import { AppThemeKey } from '../../../util/theme/models';
import PendingSpinner from '../Money/components/PendingSpinner/PendingSpinner';
import { createStyles } from './ActivityListItemRow.styles';
import { ActivityListItemRowIcon } from './ActivityListItemRowIcon';
import { ActivityListItemRowLayout } from './ActivityListItemRowLayout';
import { resolveIconType } from './resolveIconType';
import { useActivityListItemRowContent } from './useActivityListItemRowContent';
import type { ActivityListItemRowProps } from './ActivityListItemRow.types';

export function PendingActivityListItemRow({
  bridgeHistoryItem,
  item,
  index,
  onPress,
  title: titleOverride,
}: ActivityListItemRowProps) {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector(
    (state: RootState) => state.user.appTheme as AppThemeKey,
  );
  const content = useActivityListItemRowContent(
    item,
    undefined,
    bridgeHistoryItem,
  );
  const styles = createStyles(colors, typography);
  const icon = getTransactionIcon(
    resolveIconType(item.type),
    false,
    appTheme,
    osColorScheme,
  );
  const networkImageSource = getNetworkImageSource({
    chainId: item.chainId,
  });

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  const testIdSuffix = item.hash ?? index;
  const isQueued = item.isEarliestNonce === false;
  const subtitle = content.subtitle
    ? isQueued
      ? `${strings('transaction.queued')} • ${content.subtitle}`
      : content.subtitle
    : undefined;

  const titleAccessory = isQueued ? undefined : (
    <View style={styles.titleSpinner}>
      <PendingSpinner testID={`activity-pending-spinner-${testIdSuffix}`} />
    </View>
  );

  const subtitleLeadingAccessory = isQueued ? (
    <View style={styles.subtitleLeadingIcon}>
      <Icon
        name={IconName.Clock}
        size={IconSize.Xs}
        color={IconColor.IconAlternative}
      />
    </View>
  ) : undefined;

  return (
    <ActivityListItemRowLayout
      avatar={
        <ActivityListItemRowIcon
          fallbackIcon={icon}
          networkImageSource={networkImageSource}
          styles={styles}
          tokens={content.avatarTokens}
        />
      }
      index={index}
      isFailed={false}
      item={item}
      onPress={handlePress}
      primaryAmount={content.primaryAmount}
      primaryToken={content.primaryToken}
      secondaryAmount={content.secondaryAmount}
      styles={styles}
      subtitle={subtitle}
      subtitleLeadingAccessory={subtitleLeadingAccessory}
      title={titleOverride ?? content.title}
      titleAccessory={titleAccessory}
    />
  );
}

export default PendingActivityListItemRow;
