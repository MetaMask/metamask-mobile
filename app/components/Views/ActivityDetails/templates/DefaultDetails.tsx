import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import {
  ActivityDetailsAmountHeader,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsFooter,
  ActivityDetailsMetadata,
} from '../components';
import type { ActivityDetailsTemplateProps } from '../ActivityDetails.types';

/**
 * Generic, type-agnostic details layout used as the fallback for any activity
 * kind without a dedicated template. Mirrors the extension's `DefaultDetails`.
 * The footer is pinned to the bottom of the screen.
 */
export function DefaultDetails({ item }: ActivityDetailsTemplateProps) {
  return (
    <Box twClassName="flex-1">
      <ActivityDetailsAmountHeader item={item} />
      <SectionDivider marginVertical={3} />
      <ActivityDetailsMetadata item={item} />
      <Box twClassName="mt-auto pt-4">
        <ActivityDetailsFooter>
          <ActivityDetailsBlockExplorerButton
            chainId={item.chainId}
            hash={item.hash}
          />
        </ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
