// Third party dependencies.
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

// External dependencies.
import {
  Icon,
  IconSize,
  Text,
  IconName,
  TextVariant,
  TextColor,
  IconColor,
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
  justifyContent,
  endIconName = IconName.ArrowRight,
  endIconColor = IconColor.IconAlternative,
  style,
  twClassName,
  testID,
}) => {
  const tw = useTailwind();

  // Default horizontal padding + row layout; apply style to this same container so callers can override padding (e.g. paddingHorizontal: 0)
  const containerTwClassName = twClassName
    ? `px-4 flex-row items-center ${twClassName}`
    : 'px-4 flex-row items-center';
  const containerStyle = StyleSheet.flatten([
    tw.style(containerTwClassName),
    justifyContent ? tw.style(justifyContent) : undefined,
    style,
  ]);

  const children = (
    <>
      {typeof title === 'string' ? (
        <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
          {title}
        </Text>
      ) : (
        title
      )}

      {/* Arrow icon: visual indicator only, no touch handling */}
      {onPress && (
        <Icon
          testID="section-header-arrow-icon"
          name={endIconName}
          size={IconSize.Md}
          color={endIconColor}
          style={tw.style('ml-1')}
        />
      )}

      {endAccessory}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessible={false}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={containerStyle}>
      {children}
    </View>
  );
};

export default SectionHeader;
