// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import {
  SectionHeader as MMDSSectionHeader,
  IconName,
  IconSize,
  IconColor,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { SectionHeaderProps } from './SectionHeader.types';

/**
 * SectionHeader — wallet and homepage section header with optional press-to-navigate.
 *
 * Renders {@link MMDSSectionHeader} from the design system. When `onPress` is
 * provided, the header is wrapped in a pressable container and shows a trailing
 * chevron via `endIconName` and `endIconProps`.
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
  const containerTwClassName = [
    'px-4',
    justifyContent === BoxJustifyContent.Between
      ? 'justify-between'
      : undefined,
    twClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const header = (
    <MMDSSectionHeader
      title={title}
      endAccessory={endAccessory}
      endIconName={onPress ? endIconName : undefined}
      endIconProps={
        onPress
          ? {
              testID: 'section-header-arrow-icon',
              size: IconSize.Md,
              color: endIconColor,
            }
          : undefined
      }
      twClassName={containerTwClassName}
      testID={onPress ? undefined : testID}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={typeof title === 'string' ? title : undefined}
      >
        {header}
      </TouchableOpacity>
    );
  }

  return header;
};

export default SectionHeader;
