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
import { TitleLeftProps } from './TitleLeft.types';
import { TitleLeftTestIds } from './TitleLeft.constants';

/**
 * TitleLeft is a component that displays a title with optional accessories
 * in a left-aligned layout with an optional endAccessory on the right.
 *
 * @example
 * ```tsx
 * <TitleLeft
 *   topLabel="Send"
 *   title="$4.42"
 *   endAccessory={<Avatar />}
 * />
 * ```
 */
const TitleLeft: React.FC<TitleLeftProps> = ({
  title,
  titleAccessory,
  topAccessory,
  topLabel,
  endAccessory,
  bottomAccessory,
  bottomLabel,
  testID = TitleLeftTestIds.CONTAINER,
}) => {
  // Render top content (topLabel takes priority over topAccessory)
  const renderTopContent = () => {
    if (topLabel) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={TitleLeftTestIds.TOP_LABEL}
        >
          {topLabel}
        </Text>
      );
    }
    return topAccessory;
  };

  // Render bottom content (bottomLabel takes priority over bottomAccessory)
  const renderBottomContent = () => {
    if (bottomLabel) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={TitleLeftTestIds.BOTTOM_LABEL}
        >
          {bottomLabel}
        </Text>
      );
    }
    return bottomAccessory;
  };

  const hasTopContent = topAccessory || topLabel;
  const hasBottomContent = bottomAccessory || bottomLabel;

  return (
    <Box twClassName="px-4 pt-1 pb-3" testID={testID}>
      {/* Top row */}
      {hasTopContent && (
        <Box testID={TitleLeftTestIds.TOP_ROW}>{renderTopContent()}</Box>
      )}

      {/* Main content row: left (title + bottom) and right (endAccessory) */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
      >
        {/* Left content */}
        <Box twClassName="flex-1">
          {/* Title row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            testID={TitleLeftTestIds.TITLE_ROW}
          >
            {title && (
              <Text
                variant={TextVariant.DisplayMd}
                testID={TitleLeftTestIds.TITLE}
              >
                {title}
              </Text>
            )}
            {titleAccessory}
          </Box>

          {/* Bottom row */}
          {hasBottomContent && (
            <Box testID={TitleLeftTestIds.BOTTOM_ROW}>
              {renderBottomContent()}
            </Box>
          )}
        </Box>

        {/* End accessory - vertically centered */}
        {endAccessory && (
          <Box testID={TitleLeftTestIds.END_ACCESSORY}>{endAccessory}</Box>
        )}
      </Box>
    </Box>
  );
};

export default TitleLeft;
