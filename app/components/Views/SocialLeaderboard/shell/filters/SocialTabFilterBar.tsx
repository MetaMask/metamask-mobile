import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';

export interface SocialTabFilterBarProps {
  children: React.ReactNode;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  filterTestID: string;
  /** Test ID for the bar itself, separate from the filter button. */
  testID?: string;
  /** Overrides the default `px-4 pt-1 pb-4` padding. */
  twClassName?: string;
}

/**
 * Shared V1 tab chrome: one left-hand control and the Custom filters icon.
 */
const SocialTabFilterBar: React.FC<SocialTabFilterBarProps> = ({
  children,
  onOpenFilters,
  isFilterActive = false,
  filterTestID,
  testID,
  twClassName = 'px-4 pt-1 pb-4',
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    testID={testID}
    twClassName={twClassName}
  >
    <Box twClassName="flex-1 min-w-0">{children}</Box>
    <ButtonIcon
      iconName={IconName.Filter}
      size={ButtonIconSize.Lg}
      // Large buttons map to a 32px glyph. This control stays at 24px.
      iconProps={{ size: IconSize.Lg }}
      onPress={
        onOpenFilters
          ? () => {
              fireImpact(ImpactMoment.SecondaryCTA);
              onOpenFilters();
            }
          : undefined
      }
      testID={filterTestID}
      accessibilityLabel={strings('social_leaderboard.shell.filters.title')}
      accessibilityState={{ selected: isFilterActive }}
      twClassName={
        isFilterActive
          ? 'rounded-full bg-primary-muted'
          : 'rounded-full bg-background-muted'
      }
    />
  </Box>
);

export default SocialTabFilterBar;
