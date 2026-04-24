import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  IconAlert,
  IconSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { ResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';

/**
 * SecurityBanner component props
 */
export interface SecurityBannerProps {
  /** Configuration object with icon and styling information */
  securityConfig: ResultTypeConfig;
  /** Background color class (e.g., 'bg-error-muted', 'bg-warning-muted') */
  backgroundClass: string;
  /** Font weight for the title */
  titleFontWeight: FontWeight;
  /** TestID for the banner */
  testID: string;
  /** Callback when banner is pressed. If not provided, banner is non-interactive */
  onPress?: () => void;
  /** Optional custom className for spacing/styling overrides */
  className?: string;
  /** Optional title to display */
  title?: string;
  /** Optional description text to display */
  description?: string;
}

/**
 * SecurityBanner displays a warning banner for tokens with security concerns.
 * Can be interactive (with onPress) or non-interactive (display only).
 *
 * @param props - Component props
 * @returns Security warning banner component
 */
export const SecurityBanner: React.FC<SecurityBannerProps> = ({
  securityConfig,
  backgroundClass,
  titleFontWeight,
  testID,
  onPress,
  className,
  title,
  description,
}) => {
  const descriptionText = description ?? null;
  const titleText = title ?? null;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName={`self-stretch py-3 pl-6 pr-4 rounded-2xl ${backgroundClass} ${className || ''}`}
      testID={onPress ? undefined : testID}
    >
      <Box twClassName="pt-[2px]">
        {securityConfig.iconAlertSeverity && (
          <IconAlert
            severity={securityConfig.iconAlertSeverity}
            size={IconSize.Md}
          />
        )}
      </Box>
      <Box twClassName="flex-1">
        {titleText && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={titleFontWeight}
          >
            {titleText}
          </Text>
        )}
        {descriptionText && (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {descriptionText}
          </Text>
        )}
      </Box>
    </Box>
  );

  // If onPress is provided, wrap in TouchableOpacity for interactivity
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {content}
      </TouchableOpacity>
    );
  }

  // Non-interactive version (for bottom sheet) - return content directly
  return content;
};
