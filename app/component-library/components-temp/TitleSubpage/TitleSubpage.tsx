// Third party dependencies.
import React from 'react';

// External dependencies.
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { TitleSubpageProps } from './TitleSubpage.types';

/**
 * TitleSubpage is a component that displays a title with optional accessories
 * in a left-aligned layout, with an optional startAccessory to the left.
 *
 * @example
 * ```tsx
 * <TitleSubpage
 *   startAccessory={<AvatarToken />}
 *   title="Token Name"
 *   bottomLabel="$1,234.56"
 * />
 * ```
 */
const TitleSubpage: React.FC<TitleSubpageProps> = ({
  title,
  titleAccessory,
  startAccessory,
  bottomAccessory,
  bottomLabel,
  titleProps,
  bottomLabelProps,
  testID,
  twClassName,
}) => {
  // Render bottom content (bottomLabel takes priority over bottomAccessory)
  const renderBottomContent = () => {
    if (bottomLabel) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          {...bottomLabelProps}
        >
          {bottomLabel}
        </Text>
      );
    }
    return bottomAccessory;
  };

  const hasBottomContent = bottomAccessory || bottomLabel;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName={twClassName}
      testID={testID}
    >
      {/* Start accessory */}
      {startAccessory}

      {/* Title and bottom content container */}
      <Box twClassName="flex-1">
        {/* Title row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          {title && (
            <Text variant={TextVariant.HeadingMd} {...titleProps}>
              {title}
            </Text>
          )}
          {titleAccessory}
        </Box>

        {/* Bottom row */}
        {hasBottomContent && <Box>{renderBottomContent()}</Box>}
      </Box>
    </Box>
  );
};

export default TitleSubpage;
