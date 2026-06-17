import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  SegmentButton,
  SegmentGroup,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../locales/i18n';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

import {
  NotificationCategoryId,
  NotificationsCategoryProps,
} from './NotificationsCategory.types';
import { NotificationsCategorySelectorsIDs } from './NotificationsCategory.testIds';

interface CategoryTab {
  key: NotificationCategoryId;
  label: string;
  testID: string;
}

/**
 * Horizontally scrollable category filter for the notifications list, built on
 * the design-system `SegmentGroup` / `SegmentButton`. The set of categories is
 * gated by feature flags: the activity-related categories only appear when
 * MetaMask notifications are enabled, and "Trading Signals" only when the social
 * leaderboard flag is on.
 */
const NotificationsCategory = ({
  onSelect,
  testID,
}: NotificationsCategoryProps) => {
  const tw = useTailwind();
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );

  const [selectedCategory, setSelectedCategory] =
    useState<NotificationCategoryId>(NotificationCategoryId.All);

  const tabs = useMemo<CategoryTab[]>(() => {
    const items: CategoryTab[] = [
      {
        key: NotificationCategoryId.All,
        label: strings('app_settings.notifications_opts.all_title'),
        testID: NotificationsCategorySelectorsIDs.ALL,
      },
    ];

    if (isMetamaskNotificationsEnabled) {
      items.push(
        {
          key: NotificationCategoryId.WalletActivity,
          label: strings(
            'app_settings.notifications_opts.wallet_activity_title',
          ),
          testID: NotificationsCategorySelectorsIDs.WALLET_ACTIVITY,
        },
        {
          key: NotificationCategoryId.Perps,
          label: strings('app_settings.notifications_opts.perps_title'),
          testID: NotificationsCategorySelectorsIDs.PERPS,
        },
      );

      if (isSocialLeaderboardEnabled) {
        items.push({
          key: NotificationCategoryId.SocialAI,
          label: strings('app_settings.notifications_opts.social_ai_title'),
          testID: NotificationsCategorySelectorsIDs.SOCIAL_AI,
        });
      }

      items.push({
        key: NotificationCategoryId.Marketing,
        label: strings('app_settings.notifications_opts.marketing_title'),
        testID: NotificationsCategorySelectorsIDs.MARKETING,
      });
    }

    return items;
  }, [isMetamaskNotificationsEnabled, isSocialLeaderboardEnabled]);

  const handleSelect = useCallback(
    (key: string) => {
      const category = key as NotificationCategoryId;
      setSelectedCategory(category);
      onSelect(category);
    },
    [onSelect],
  );

  return (
    <SegmentGroup
      value={selectedCategory}
      onChange={handleSelect}
      twClassName="gap-2 px-4 py-1"
      style={tw.style('flex-grow-0')}
      testID={testID ?? NotificationsCategorySelectorsIDs.CONTAINER}
    >
      {tabs.map((tab) => (
        <SegmentButton key={tab.key} value={tab.key} testID={tab.testID}>
          {tab.label}
        </SegmentButton>
      ))}
    </SegmentGroup>
  );
};

export default NotificationsCategory;
