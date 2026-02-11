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
  twClassName = '',
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={3}
    twClassName={twClassName}
    testID={testID}
  >
    {startAccessory}

    <Box twClassName="flex-1">
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

      {(bottomAccessory || bottomLabel) && (
        <Box>
          {bottomLabel ? (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              {...bottomLabelProps}
            >
              {bottomLabel}
            </Text>
          ) : (
            bottomAccessory
          )}
        </Box>
      )}
    </Box>
  </Box>
);

export default TitleSubpage;
