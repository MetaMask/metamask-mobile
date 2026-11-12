import React, { type ReactNode } from 'react';
import {
  Box,
  SectionHeader,
  IconSize,
} from '@metamask/design-system-react-native';

/** Collectibles section spacing around the shared MetaMask heading. */
export default function CollectiblesSectionHeader({
  title,
  onPress,
  action,
  divider = true,
}: {
  title: string;
  onPress?: () => void;
  action?: ReactNode;
  divider?: boolean;
}) {
  return (
    <Box>
      {divider && (
        <Box twClassName="py-5">
          <Box twClassName="border-t border-muted" />
        </Box>
      )}
      <Box twClassName="pt-3 pb-4 px-4 flex-row items-center justify-between gap-2">
        {onPress ? (
          <SectionHeader
            title={title}
            isInteractive
            onPress={onPress}
            hitSlop={8}
            endIconProps={{ size: IconSize.Md }}
            twClassName="p-0 shrink"
          />
        ) : (
          <SectionHeader title={title} twClassName="p-0 shrink" />
        )}
        {action}
      </Box>
    </Box>
  );
}
