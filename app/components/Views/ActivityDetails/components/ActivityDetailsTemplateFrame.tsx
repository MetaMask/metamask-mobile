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
}: {
  hero?: React.ReactNode;
  metadata: React.ReactNode;
  details?: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Box twClassName="flex-1">
      {hero}
      {hero ? <SectionDivider marginVertical={3} /> : null}
      {metadata}
      {details ? (
        <>
          <SectionDivider marginVertical={3} />
          {details}
        </>
      ) : null}
      <Box twClassName="mt-auto pt-4">
        <ActivityDetailsFooter>{footer}</ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
