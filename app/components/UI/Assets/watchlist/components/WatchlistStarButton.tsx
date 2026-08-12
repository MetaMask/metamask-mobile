import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { strings } from '../../../../../../locales/i18n';
import { selectTokenWatchlistEnabled } from '../../selectors/featureFlags';
import { useTokenWatchlist } from '../hooks/useTokenWatchlist';
import { WatchlistStarButtonTestIds } from './WatchlistStarButton.testIds';

interface WatchlistStarButtonProps {
  assetId: CaipAssetType | null;
  /** Analytics: 'native' | 'erc20' */
  assetType: 'native' | 'erc20';
  /** Analytics: does the user hold a balance of this token? (only sent on add) */
  hasBalance?: boolean;
  /** Analytics: which surface triggered this (e.g. 'token_details') */
  source: string;
}

/**
 * Self-contained watchlist star toggle button. Internally manages the
 * watchlist hook, toast feedback, and analytics -- consumers only need
 * to provide the asset identifier and analytics context.
 *
 * Returns `null` when the feature flag is off or `assetId` is null.
 */
const WatchlistStarButton = ({
  assetId,
  assetType,
  hasBalance,
  source,
}: WatchlistStarButtonProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const { isWatched, toggle } = useTokenWatchlist(assetId);

  const handlePress = useCallback(() => {
    const wasWatched = isWatched;
    toggle();

    toast({
      title: wasWatched
        ? strings('token_watchlist.removed_from_watchlist')
        : strings('token_watchlist.added_to_watchlist'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
    });

    const eventName = wasWatched
      ? MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED
      : MetaMetricsEvents.WATCHLIST_TOKEN_ADDED;

    trackEvent(
      createEventBuilder(eventName)
        .addProperties({
          source,
          asset_id: assetId,
          asset_type: assetType,
          ...(wasWatched ? {} : { has_balance: hasBalance }),
        })
        .build(),
    );
  }, [
    isWatched,
    toggle,
    trackEvent,
    createEventBuilder,
    source,
    assetId,
    assetType,
    hasBalance,
  ]);

  if (!isWatchlistEnabled || !assetId) {
    return null;
  }

  return (
    <ButtonIcon
      iconName={isWatched ? IconName.StarFilled : IconName.Star}
      size={ButtonIconSize.Md}
      onPress={handlePress}
      testID={WatchlistStarButtonTestIds.BUTTON}
      accessibilityLabel={
        isWatched ? 'Remove from watchlist' : 'Add to watchlist'
      }
    />
  );
};

export default WatchlistStarButton;
