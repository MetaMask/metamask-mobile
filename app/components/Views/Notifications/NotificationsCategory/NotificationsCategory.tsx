import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FilterButton,
  FilterButtonGroup,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../locales/i18n';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectPriceAlertsEnabled } from '../../../../selectors/featureFlagController/priceAlerts';
import {
  ALL_NOTIFICATIONS_CATEGORY_ID,
  getCategoryTitle,
  getNotificationsSettingsSectionConfigs,
  useNotificationCategories,
} from '../../../../util/notifications/categories';

import { NotificationsCategoryProps } from './NotificationsCategory.types';
import {
  categoryTestID,
  NotificationsCategorySelectorsIDs,
} from './NotificationsCategory.testIds';
import NotificationsCategorySkeleton from './NotificationsCategorySkeleton';

interface CategoryTab {
  key: string;
  label: string;
  testID: string;
}

/**
 * Horizontally scrollable category filter for the notifications list, built on
 * the design-system `SegmentGroup` / `SegmentButton`. Tabs are driven by the
 * BE-provided category catalog; the "Trading Signals" category is additionally
 * filtered out when the social leaderboard flag is off.
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
  const isPriceAlertsEnabled = useSelector(selectPriceAlertsEnabled);
  const { categories, isLoading } = useNotificationCategories();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    ALL_NOTIFICATIONS_CATEGORY_ID,
  );

  const tabs = useMemo<CategoryTab[]>(() => {
    if (!isMetamaskNotificationsEnabled) {
      return [];
    }

    const items: CategoryTab[] = [
      {
        key: ALL_NOTIFICATIONS_CATEGORY_ID,
        label: strings('app_settings.notifications_opts.all_title'),
        testID: NotificationsCategorySelectorsIDs.ALL,
      },
    ];

    const sectionConfigs = getNotificationsSettingsSectionConfigs(categories, {
      isSocialLeaderboardEnabled,
      isPriceAlertsEnabled,
    });

    sectionConfigs.forEach((category) => {
      items.push({
        key: category.categoryId,
        label: getCategoryTitle(category.categoryId),
        testID: categoryTestID(category.categoryId),
      });
    });

    return items;
  }, [
    categories,
    isMetamaskNotificationsEnabled,
    isPriceAlertsEnabled,
    isSocialLeaderboardEnabled,
  ]);

  const handleSelect = useCallback(
    (key: string) => {
      setSelectedCategory(key);
      onSelect(key);
    },
    [onSelect],
  );

  if (!isMetamaskNotificationsEnabled) {
    return null;
  }

  if (isLoading) {
    return <NotificationsCategorySkeleton />;
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <FilterButtonGroup
      value={selectedCategory}
      onChange={handleSelect}
      twClassName="gap-2 px-4 py-1"
      style={tw.style('flex-grow-0')}
      testID={testID ?? NotificationsCategorySelectorsIDs.CONTAINER}
    >
      {tabs.map((tab) => (
        <FilterButton key={tab.key} value={tab.key} testID={tab.testID}>
          {tab.label}
        </FilterButton>
      ))}
    </FilterButtonGroup>
  );
};

export default NotificationsCategory;
