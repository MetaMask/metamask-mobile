import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import ToastService from '../../../../../core/ToastService/ToastService';
import { ToastVariants } from '../../../../../component-library/components/Toast/Toast.types';
import { IconName as LegacyIconName } from '../../../../../component-library/components/Icons/Icon';
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
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const { isWatched, toggle } = useTokenWatchlist(assetId);

  const handlePress = useCallback(() => {
    const wasWatched = isWatched;
    toggle();

    ToastService.showToast({
      variant: ToastVariants.Icon,
      iconName: LegacyIconName.Confirmation,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.background.section,
      labelOptions: [
        {
          label: wasWatched
            ? strings('token_watchlist.removed_from_watchlist')
            : strings('token_watchlist.added_to_watchlist'),
        },
      ],
      hasNoTimeout: false,
    });

    const eventName = wasWatched
      ? MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED
      : MetaMetricsEvents.WATCHLIST_TOKEN_ADDED;

    trackEvent(
      createEventBuilder(eventName)
        .addProperties({
          source,
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
    assetType,
    hasBalance,
    theme.colors.success.default,
    theme.colors.background.section,
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
