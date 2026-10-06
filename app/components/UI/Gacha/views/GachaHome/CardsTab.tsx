import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { GachaCardsTestIds } from '../../Gacha.testIds';

/** Placeholder for the card collection. */
const CardsTab = () => (
  <Box twClassName="flex-1" testID={GachaCardsTestIds.LIST} />
);

export default CardsTab;
