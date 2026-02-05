import React from 'react';
import { ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useSeasonDrops } from '../../../hooks/useSeasonDrops';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import DropsGroup from './DropsGroup';

/**
 * DropsTab displays all drops organized by status:
 * - Active (live)
 * - Upcoming
 * - Previous (calculating, distributing, complete)
 */
export const DropsTab: React.FC = () => {
  const tw = useTailwind();
  const { categorizedDrops, isLoading, hasError, fetchDrops } =
    useSeasonDrops();

  const { active, upcoming, previous } = categorizedDrops;
  const hasDrops =
    active.length > 0 || upcoming.length > 0 || previous.length > 0;

  const renderContent = () => {
    // Show loading state
    if (isLoading && !hasDrops) {
      return (
        <Box twClassName="gap-6">
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-20 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-24 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
        </Box>
      );
    }

    // Show error state
    if (hasError && !hasDrops) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.drop_tab.error_title')}
          description={strings('rewards.drop_tab.error_description')}
          onConfirm={fetchDrops}
          confirmButtonLabel={strings('rewards.drop_tab.retry_button')}
        />
      );
    }

    // Show empty state
    if (!hasDrops) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.drop_tab.empty_state')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
        {/* Active Drops */}
        <DropsGroup
          title={strings('rewards.drop_tab.active_title')}
          drops={active}
          testID={REWARDS_VIEW_SELECTORS.DROPS_ACTIVE_SECTION}
        />

        {/* Upcoming Drops */}
        <DropsGroup
          title={strings('rewards.drop_tab.upcoming_title')}
          drops={upcoming}
          testID={REWARDS_VIEW_SELECTORS.DROPS_UPCOMING_SECTION}
        />

        {/* Previous Drops */}
        <DropsGroup
          title={strings('rewards.drop_tab.previous_title')}
          drops={previous}
          testID={REWARDS_VIEW_SELECTORS.DROPS_PREVIOUS_SECTION}
        />
      </Box>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={tw.style('flex-grow p-4')}
      showsVerticalScrollIndicator={false}
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_DROPS}
    >
      {/* Loading indicator when refreshing */}
      {isLoading && hasDrops && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-2"
        >
          <ActivityIndicator size="small" />
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('rewards.drop_tab.refreshing')}
          </Text>
        </Box>
      )}

      {renderContent()}
    </ScrollView>
  );
};
