import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { SnapshotTile } from '../../SnapshotTile';
import type { SnapshotDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

interface SnapshotsGroupProps {
  title: string;
  snapshots: SnapshotDto[];
  testID?: string;
}

/**
 * Section component for displaying a group of snapshots with a title
 */
const SnapshotsGroup: React.FC<SnapshotsGroupProps> = ({
  title,
  snapshots,
  testID,
}) => {
  if (snapshots.length === 0) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={testID}>
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {title}
      </Text>
      {snapshots.map((snapshot) => (
        <SnapshotTile key={snapshot.id} snapshot={snapshot} />
      ))}
    </Box>
  );
};

export default SnapshotsGroup;
