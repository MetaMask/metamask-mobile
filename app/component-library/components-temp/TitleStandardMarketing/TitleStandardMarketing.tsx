// Third party dependencies.
import React from 'react';

// External dependencies.
import {
  Box,
  BoxRow,
  FontFamily,
  FontWeight,
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
    <BoxRow
      gap={2}
      {...titleWrapperProps}
      endAccessory={titleEndAccessory}
      textProps={{
        variant: TextVariant.DisplayLg,
        fontFamily: FontFamily.Hero,
        style: { lineHeight: typography.sDisplayLG.fontSize },
        ...titleProps,
      }}
    >
      {title}
    </BoxRow>
    {bottomLabel && (
      <BoxRow
        gap={2}
        {...bottomLabelWrapperProps}
        endAccessory={bottomLabelEndAccessory}
        textProps={{
          variant: TextVariant.BodyMd,
          fontWeight: FontWeight.Medium,
          color: TextColor.TextAlternative,
          ...bottomLabelProps,
        }}
      >
        {bottomLabel}
      </BoxRow>
    )}
    {!bottomLabel && bottomAccessory}
  </Box>
);

TitleStandardMarketing.displayName = 'TitleStandardMarketing';

export default TitleStandardMarketing;
