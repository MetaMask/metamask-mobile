import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import DropTile from '../../DropTile/DropTile';
import type { SeasonDropDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

interface DropsGroupProps {
  title: string;
  drops: SeasonDropDto[];
  testID?: string;
}

/**
 * Section component for displaying a group of drops with a title
 */
const DropsGroup: React.FC<DropsGroupProps> = ({ title, drops, testID }) => {
  if (drops.length === 0) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={testID}>
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {title}
      </Text>
      {drops.map((drop) => (
        <DropTile key={drop.id} drop={drop} />
      ))}
    </Box>
  );
};

export default DropsGroup;
