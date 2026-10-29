import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { ActivityDetailsFooter } from './ActivityDetailsFooter';

/**
 * Shared layout for per-type details templates: optional hero, metadata,
 * optional details section, and a bottom-pinned footer. Dividers are only
 * rendered around sections that are present.
 */
export function ActivityDetailsTemplateFrame({
  hero,
  metadata,
  details,
  footer,
  heroDividerMarginVertical = 0,
  heroDividerTestID,
}: {
  hero?: React.ReactNode;
  metadata: React.ReactNode;
  details?: React.ReactNode;
  footer: React.ReactNode;
  /**
   * Extra vertical margin on the divider under the hero, in 4px units.
   * The frame already separates sections by 8px, so `2` makes that gap 16px.
   */
  heroDividerMarginVertical?: 0 | 2 | 4;
  heroDividerTestID?: string;
}) {
  return (
    <Box twClassName="flex-1 gap-2">
      {hero}
      {hero ? (
        <SectionDivider
          marginVertical={heroDividerMarginVertical}
          testID={heroDividerTestID}
        />
      ) : null}
      {metadata}
      {details ? (
        <>
          <SectionDivider marginVertical={0} />
          {details}
        </>
      ) : null}
      <Box twClassName="mt-auto pt-4">
        <ActivityDetailsFooter>{footer}</ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
