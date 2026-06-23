/**
 * Row component that renders a single ActivityListItem from the shared adapter shape.
 * All styling and localization are Mobile-specific; data comes from the shared adapters.
 */
import React, { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { getNetworkImageSource } from '../../../util/networks';
import { RootState } from '../../../reducers';
import { AppThemeKey } from '../../../util/theme/models';
import { createStyles } from './ActivityListItemRow.styles';
import { ActivityListItemRowIcon } from './ActivityListItemRowIcon';
import { ActivityListItemRowLayout } from './ActivityListItemRowLayout';
import { PendingActivityListItemRow } from './PendingActivityListItemRow';
import { resolveIconType } from './resolveIconType';
import { useActivityListItemRowContent } from './useActivityListItemRowContent';
import type { ActivityListItemRowProps } from './ActivityListItemRow.types';

export { resolveActivityListItemTitle } from './useActivityListItemRowContent';
export { resolveIconType } from './resolveIconType';

function ResolvedActivityListItemRow({
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
  const isFailed = item.status === 'failed' || item.status === 'cancelled';
  const icon = getTransactionIcon(
    resolveIconType(item.type),
    isFailed,
    appTheme,
    osColorScheme,
  );
  const networkImageSource = getNetworkImageSource({
    chainId: item.chainId,
  });

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

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
      isFailed={isFailed}
      item={item}
      onPress={handlePress}
      primaryAmount={content.primaryAmount}
      primaryToken={content.primaryToken}
      secondaryAmount={content.secondaryAmount}
      styles={styles}
      subtitle={content.subtitle}
      title={titleOverride ?? content.title}
    />
  );
}

/**
 * Dispatches to the pending or resolved row variant, mirroring the extension's
 * `ActivityRow`. Holds no hooks so the branch can switch as a row transitions
 * from pending to a final status.
 */
export function ActivityListItemRow(props: ActivityListItemRowProps) {
  if (props.item.status === 'pending') {
    return <PendingActivityListItemRow {...props} />;
  }

  return <ResolvedActivityListItemRow {...props} />;
}

export default ActivityListItemRow;
