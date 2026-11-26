/**
 * Pending variant of the activity row. Reuses the shared row content/layout,
 * shows a spinner beside the title for in-flight txs, and prefixes queued txs
 * with an hourglass indicator while keeping the normal address subtitle.
 */
import React, { useCallback } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { getNetworkImageSource } from '../../../util/networks';
import PendingSpinner from '../Money/components/PendingSpinner/PendingSpinner';
import { ActivityListItemRowIcon } from './ActivityListItemRowIcon';
import { ActivityListItemRowLayout } from './ActivityListItemRowLayout';
import { resolveTransactionIconName } from './resolveIconType';
import { useActivityListItemRowContent } from './useActivityListItemRowContent';
import { useSubtitleAccountParts } from './useSubtitleAccountParts';
import { View } from '../primitives/View';
import type { ActivityListItemRowProps } from './ActivityListItemRow.types';

export function PendingActivityListItemRow({
  bridgeHistoryItem,
  item,
  index,
  onPress,
  title: titleOverride,
}: ActivityListItemRowProps) {
  const content = useActivityListItemRowContent(
    item,
    undefined,
    bridgeHistoryItem,
  );
  const fallbackIconName = resolveTransactionIconName(item.type);
  const networkImageSource = getNetworkImageSource({
    chainId: item.chainId,
  });

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  const testIdSuffix = item.hash ?? index ?? 0;
  const isQueued = item.isEarliestNonce === false;
  const subtitle = content.subtitle
    ? isQueued
      ? `${strings('transaction.queued')} • ${content.subtitle}`
      : content.subtitle
    : undefined;

  const subtitleAccountParts = useSubtitleAccountParts(content, testIdSuffix);
  const subtitleParts =
    subtitleAccountParts && isQueued
      ? {
          ...subtitleAccountParts,
          pre: `${strings('transaction.queued')} • ${subtitleAccountParts.pre}`,
        }
      : subtitleAccountParts;

  const titleAccessory = isQueued ? undefined : (
    <View
      className="ml-1.5 h-[18px] shrink-0 -translate-y-0.5 justify-center"
      testID={`activity-pending-spinner-container-${testIdSuffix}`}
    >
      <PendingSpinner testID={`activity-pending-spinner-${testIdSuffix}`} />
    </View>
  );

  const subtitleLeadingAccessory = isQueued ? (
    <View className="mr-1 h-4 -translate-y-px justify-center">
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
          fallbackIconName={fallbackIconName}
          networkImageSource={networkImageSource}
          testIdSuffix={testIdSuffix}
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
      subtitle={subtitle}
      subtitleLeadingAccessory={subtitleLeadingAccessory}
      subtitleParts={subtitleParts}
      title={titleOverride ?? content.title}
      titleAccessory={titleAccessory}
    />
  );
}

export default PendingActivityListItemRow;
