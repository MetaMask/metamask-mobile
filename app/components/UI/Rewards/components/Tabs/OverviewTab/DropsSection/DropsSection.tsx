import React, { useMemo } from 'react';
import { ActivityIndicator, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';
import { selectDropsRewardsEnabledFlag } from '../../../../../../../selectors/featureFlagController/rewards';
import { useSeasonDrops } from '../../../../hooks/useSeasonDrops';
import DropTile from '../../../../components/DropTile/DropTile';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import RewardsErrorBanner from '../../../../components/RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from '../../../../Views/RewardsView.constants';
import UpcomingDropTileCondensed from '../../../DropTile/UpcomingDropTileCondensed';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32; // Full width minus padding

/**
 * DropsSection displays active and upcoming drops in the Overview tab.
 * Shows all active drops first (as large tiles), then all upcoming drops
 * (as condensed tiles). Both groups are sorted by opensAt ascending (earliest first).
 */
const DropsSection: React.FC = () => {
  const isDropsEnabled = useSelector(selectDropsRewardsEnabledFlag);
  const tw = useTailwind();
  const { categorizedDrops, isLoading, hasError, fetchDrops } =
    useSeasonDrops();

  const { active, upcoming } = categorizedDrops;

  // Sort active and upcoming by opensAt ascending (earliest first)
  const sortedDrops = useMemo(() => {
    const sortByOpensAt = (a: (typeof active)[0], b: (typeof active)[0]) =>
      new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime();

    const sortedActive = [...active].sort(sortByOpensAt);
    const sortedUpcoming = [...upcoming].sort(sortByOpensAt);

    // Active drops first, then upcoming
    return [...sortedActive, ...sortedUpcoming];
  }, [active, upcoming]);

  const hasDrops = sortedDrops.length > 0;

  // Return null if drops feature is disabled
  if (!isDropsEnabled) {
    return null;
  }

  // Don't render if no drops and not loading/error
  if (!isLoading && !hasError && !hasDrops) {
    return null;
  }

  const renderContent = () => {
    // Show loading state
    if (isLoading && !hasDrops) {
      return (
        <Skeleton
          style={tw.style('h-50 rounded-xl bg-muted')}
          width={CARD_WIDTH}
        />
      );
    }

    // Show error state
    if (hasError && !hasDrops) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.drop_section.error_title')}
          description={strings('rewards.drop_section.error_description')}
          onConfirm={fetchDrops}
          confirmButtonLabel={strings('rewards.drop_section.retry_button')}
        />
      );
    }

    return (
      <Box twClassName="gap-4">
        {sortedDrops.map((drop) => {
          const isActive = active.some((s) => s.id === drop.id);
          return isActive ? (
            <DropTile key={drop.id} drop={drop} />
          ) : (
            <UpcomingDropTileCondensed key={drop.id} drop={drop} />
          );
        })}
      </Box>
    );
  };

  return (
    <Box
      twClassName="pt-2 pb-4 px-4 gap-4"
      testID={REWARDS_VIEW_SELECTORS.DROPS_SECTION}
    >
      {/* Section Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text variant={TextVariant.HeadingMd} twClassName="text-default">
            {strings('rewards.drop_section.title')}
          </Text>
          {isLoading && !hasDrops && <ActivityIndicator size="small" />}
        </Box>
      </Box>

      {/* Content */}
      {renderContent()}
    </Box>
  );
};

export default DropsSection;
