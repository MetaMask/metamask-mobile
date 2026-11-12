// Third party dependencies.
import React from 'react';

// External dependencies.
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontFamily,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { typography } from '@metamask/design-tokens';

// Internal dependencies.
import { TitleStandardMarketingProps } from './TitleStandardMarketing.types';

/**
 * TitleStandardMarketing displays a primary title with optional top, inline, and
 * bottom rows in a left-aligned layout. It mirrors the MMDS `TitleStandard` layout
 * but uses larger marketing typography (`DisplayLg` with the hero font) for the title.
 * Remaining `View` props are forwarded to the root `Box`.
 *
 * @example
 * ```tsx
 * <TitleStandardMarketing
 *   title="Import a wallet"
 *   bottomLabel="Enter your Secret Recovery Phrase"
 * />
 * ```
 */
export const TitleStandardMarketing: React.FC<TitleStandardMarketingProps> = ({
  title,
  titleEndAccessory,
  topAccessory,
  bottomAccessory,
  bottomLabel,
  bottomLabelEndAccessory,
  titleProps,
  titleWrapperProps,
  bottomLabelProps,
  bottomLabelWrapperProps,
  twClassName = '',
  ...props
}) => (
  <Box twClassName={`mb-6 ${twClassName}`} gap={2} {...props}>
    {topAccessory}
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      {...titleWrapperProps}
    >
      {typeof title === 'string' ? (
        <Text
          variant={TextVariant.DisplayLg}
          fontFamily={FontFamily.Hero}
          style={{ lineHeight: typography.sDisplayLG.fontSize }}
          {...titleProps}
        >
          {title}
        </Text>
      ) : (
        title
      )}
      {titleEndAccessory}
    </Box>
    {bottomLabel && (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        {...bottomLabelWrapperProps}
      >
        {typeof bottomLabel === 'string' ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            {...bottomLabelProps}
          >
            {bottomLabel}
          </Text>
        ) : (
          bottomLabel
        )}
        {bottomLabelEndAccessory}
      </Box>
    )}
    {!bottomLabel && bottomAccessory}
  </Box>
);

TitleStandardMarketing.displayName = 'TitleStandardMarketing';

export default TitleStandardMarketing;
