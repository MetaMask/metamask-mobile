import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';

export interface SocialTabFilterBarProps {
  children: React.ReactNode;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  filterButtonClassName?: string;
  filterButtonVariant?: ButtonIconVariant;
  filterTestID: string;
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
  filterButtonClassName,
  filterButtonVariant,
  filterTestID,
  twClassName = 'px-4 pt-1 pb-4',
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName={twClassName}
  >
    <Box twClassName="flex-1 min-w-0">{children}</Box>
    <ButtonIcon
      iconName={IconName.Customize}
      size={ButtonIconSize.Md}
      variant={filterButtonVariant}
      onPress={onOpenFilters}
      testID={filterTestID}
      accessibilityLabel={strings('social_leaderboard.shell.filters.title')}
      twClassName={
        isFilterActive
          ? 'rounded-full bg-primary-muted'
          : `rounded-full ${filterButtonClassName ?? 'bg-background-muted'}`
      }
    />
  </Box>
);

export default SocialTabFilterBar;
