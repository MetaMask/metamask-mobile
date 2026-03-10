// Third party dependencies.
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

// External dependencies.
import {
  Box,
  Text,
  ButtonIcon,
  IconName,
  ButtonIconSize,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import { SectionHeaderProps } from './SectionHeader.types';

/**
 * SectionHeader — homepage section header with optional press-to-navigate.
 *
 * @version 1 - UX Team (interim component)
 *
 * This is a v1 implementation created by the UX team to unblock RC milestones
 * while the Design System team works on an official v2. Once the DS package
 * ships a canonical section-header component, this file should be removed from
 * components-temp and the DS version adopted in its place.
 *
 * @example
 * ```tsx
 * // Navigable header with arrow icon
 * <SectionHeader title="Tokens" onPress={handleViewAll} />
 *
 * // Static header with an inline accessory
 * <SectionHeader title="DeFi" endAccessory={<InfoButton />} />
 *
 * // Custom icon and container padding override
 * <SectionHeader title="NFTs" onPress={handleViewAll} endIconName={IconName.Arrow2Right} twClassName="px-6" />
 * ```
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onPress,
  endAccessory,
  endIconName = IconName.ArrowRight,
  showEndIconBackground = true,
  style,
  twClassName,
  testID,
}) => {
  const tw = useTailwind();

  // Default horizontal padding; apply style to this same container so callers can override padding (e.g. paddingHorizontal: 0)
  const containerTwClassName = twClassName ? `px-4 ${twClassName}` : 'px-4';
  const containerStyle = StyleSheet.flatten([
    tw.style(containerTwClassName),
    style,
  ]);

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      {/* Left side: Title + optional endAccessory */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        {typeof title === 'string' ? (
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {title}
          </Text>
        ) : (
          title
        )}
        {endAccessory}
      </Box>

      {/* Right side: Icon in circle — visual indicator only, touch handled by parent */}
      {onPress && (
        <View
          pointerEvents="none"
          style={tw.style(
            'w-8 h-8 rounded-full items-center justify-center',
            showEndIconBackground && 'bg-background-muted',
          )}
        >
          <ButtonIcon iconName={endIconName} size={ButtonIconSize.Sm} />
        </View>
      )}
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={typeof title === 'string' ? title : undefined}
        style={containerStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={containerStyle}>
      {content}
    </View>
  );
};

export default SectionHeader;
