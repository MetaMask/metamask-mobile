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
import { TitleStandardProps } from './TitleStandard.types';

/**
 * TitleStandard is a component that displays a title with optional accessories
 * in a left-aligned layout.
 *
 * @example
 * ```tsx
 * <TitleStandard
 *   topLabel="Send"
 *   title="$4.42"
 *   titleAccessory={<Icon name={IconName.Info} />}
 * />
 * ```
 */
const TitleStandard: React.FC<TitleStandardProps> = ({
  title,
  titleAccessory,
  topAccessory,
  topLabel,
  bottomAccessory,
  bottomLabel,
  titleProps,
  topLabelProps,
  bottomLabelProps,
  testID,
  twClassName,
}) => {
  // Render top content (topLabel takes priority over topAccessory)
  const renderTopContent = () => {
    if (topLabel) {
      return (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          {...topLabelProps}
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
          {...bottomLabelProps}
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
    <Box twClassName={twClassName} testID={testID}>
      {/* Top row */}
      {hasTopContent && <Box>{renderTopContent()}</Box>}

      {/* Title row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {title && (
          <Text variant={TextVariant.DisplayMd} {...titleProps}>
            {title}
          </Text>
        )}
        {titleAccessory}
      </Box>

      {/* Bottom row */}
      {hasBottomContent && <Box>{renderBottomContent()}</Box>}
    </Box>
  );
};

export default TitleStandard;
