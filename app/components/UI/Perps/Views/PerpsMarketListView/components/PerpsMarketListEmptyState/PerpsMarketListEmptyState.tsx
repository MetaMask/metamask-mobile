import React from 'react';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TabEmptyState,
} from '@metamask/design-system-react-native';
import type { PerpsMarketListEmptyStateProps } from './PerpsMarketListEmptyState.types';

/**
 * PerpsMarketListEmptyState Component
 *
 * Shared "no results" state for the markets list: a search icon, a
 * description, and an optional call-to-action button (e.g. to clear an
 * active search or filter).
 *
 * @example
 * ```tsx
 * <PerpsMarketListEmptyState
 *   containerTestID="no-results"
 *   description={strings('perps.no_markets_found_description')}
 *   ctaLabel={strings('perps.clear_filter')}
 *   onCtaPress={() => setMarketTypeFilter('all')}
 * />
 * ```
 */
const PerpsMarketListEmptyState: React.FC<PerpsMarketListEmptyStateProps> = ({
  containerTestID,
  description,
  ctaLabel,
  onCtaPress,
  ctaTestID,
}) => (
  <Box
    twClassName="flex-1 items-center justify-center px-6 py-12 mb-[120px]"
    testID={containerTestID}
  >
    <TabEmptyState
      icon={
        <Icon
          name={IconName.Search}
          size={IconSize.Xl}
          color={IconColor.IconMuted}
        />
      }
      description={description}
      actionButtonText={ctaLabel}
      onAction={onCtaPress}
      actionButtonProps={ctaTestID ? { testID: ctaTestID } : undefined}
    />
  </Box>
);

export default PerpsMarketListEmptyState;
