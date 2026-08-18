import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  KeyValueRow,
  KeyValueRowVariant,
  Skeleton,
} from '@metamask/design-system-react-native';
import { KEY_VALUE_TEXT_SKELETON_HEIGHT } from './key-value-row-skeleton';

const SELECT_BUTTON_ACCESSORY_SIZE = 24;

export function KeyValueSelectSkeleton({
  testID,
}: Readonly<{ testID?: string }>) {
  return (
    <KeyValueRow
      testID={testID}
      variant={KeyValueRowVariant.Summary}
      twClassName="pr-1"
      keyLabel={
        <Skeleton height={KEY_VALUE_TEXT_SKELETON_HEIGHT} width={100} />
      }
      value={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="h-10 px-3"
        >
          <Skeleton
            height={SELECT_BUTTON_ACCESSORY_SIZE}
            width={SELECT_BUTTON_ACCESSORY_SIZE}
            twClassName="rounded-full"
          />
          <Skeleton height={KEY_VALUE_TEXT_SKELETON_HEIGHT} width={120} />
        </Box>
      }
    />
  );
}
