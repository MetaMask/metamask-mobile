import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { GachaPacksTestIds } from '../../Gacha.testIds';

/** Placeholder for the pack catalog. */
const PacksTab = () => (
  <Box twClassName="flex-1" testID={GachaPacksTestIds.LIST} />
);

export default PacksTab;
