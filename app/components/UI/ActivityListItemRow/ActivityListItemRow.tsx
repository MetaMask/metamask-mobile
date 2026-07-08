/**
 * Row component that renders a single ActivityListItem from the shared adapter shape.
 * All styling and localization are Mobile-specific; data comes from the shared adapters.
 */
import React, { useCallback } from 'react';
import { useTheme } from '../../../util/theme';
import { getNetworkImageSource } from '../../../util/networks';
import { createStyles } from './ActivityListItemRow.styles';
import { ActivityListItemRowIcon } from './ActivityListItemRowIcon';
import { ActivityListItemRowLayout } from './ActivityListItemRowLayout';
import { PendingActivityListItemRow } from './PendingActivityListItemRow';
import { resolveTransactionIconName } from './resolveIconType';
import { useActivityListItemRowContent } from './useActivityListItemRowContent';
import { useNftActivityImage } from './useNftActivityImage';
import type { ActivityListItemRowProps } from './ActivityListItemRow.types';
import type { ActivityKind } from '../../../util/activity-adapters';

export { resolveActivityListItemTitle } from './useActivityListItemRowContent';
export { resolveIconType } from './resolveIconType';

/**
 * Perps (always Arbitrum) and Predict (always Polygon) are single-network
 * domains, so the network badge on the avatar conveys nothing — suppress it.
 */
function isSingleNetworkDomainKind(type: ActivityKind): boolean {
  return (
    type.startsWith('perps') ||
    type.startsWith('prediction') ||
    type.startsWith('market') ||
    type.startsWith('stopMarket')
  );
}

/**
 * Per-kind title severity for perps closes (design): liquidations are an error
 * (red), stop-loss closes are a warning (amber). Everything else is neutral.
 */
function resolveTitleSeverity(
  type: ActivityKind,
): 'error' | 'warning' | undefined {
  switch (type) {
    case 'perpsCloseLongLiquidated':
    case 'perpsCloseShortLiquidated':
      return 'error';
    case 'perpsCloseLongStopLoss':
    case 'perpsCloseShortStopLoss':
      return 'warning';
    default:
      return undefined;
  }
}

function ResolvedActivityListItemRow({
  bridgeHistoryItem,
  item,
  index,
  onPress,
  title: titleOverride,
}: ActivityListItemRowProps) {
  const { colors, typography } = useTheme();
  const content = useActivityListItemRowContent(
    item,
    undefined,
    bridgeHistoryItem,
  );

  const nftImageUrl = useNftActivityImage(item);
  const styles = createStyles(colors, typography);
  const isFailed = item.status === 'failed' || item.status === 'cancelled';
  const fallbackIconName = resolveTransactionIconName(item.type);
  const networkImageSource = isSingleNetworkDomainKind(item.type)
    ? undefined
    : getNetworkImageSource({
        chainId: item.chainId,
      });

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  return (
    <ActivityListItemRowLayout
      avatar={
        <ActivityListItemRowIcon
          fallbackIconName={fallbackIconName}
          isFailed={isFailed}
          networkImageSource={networkImageSource}
          iconUrl={content.avatarIconUrl ?? nftImageUrl}
          perpsMarketSymbol={content.perpsMarketSymbol}
          styles={styles}
          tokens={content.avatarTokens}
        />
      }
      index={index}
      isFailed={isFailed}
      titleSeverity={resolveTitleSeverity(item.type)}
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
