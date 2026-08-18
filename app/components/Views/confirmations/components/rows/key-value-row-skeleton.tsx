import React from 'react';
import {
  KeyValueRow,
  KeyValueRowVariant,
  Skeleton,
} from '@metamask/design-system-react-native';

export const KEY_VALUE_TEXT_SKELETON_HEIGHT = 24;

export function KeyValueRowSkeleton({ testID }: Readonly<{ testID?: string }>) {
  return (
    <KeyValueRow
      testID={testID}
      variant={KeyValueRowVariant.Summary}
      keyLabel={
        <Skeleton height={KEY_VALUE_TEXT_SKELETON_HEIGHT} width={100} />
      }
      value={<Skeleton height={KEY_VALUE_TEXT_SKELETON_HEIGHT} width={80} />}
    />
  );
}
