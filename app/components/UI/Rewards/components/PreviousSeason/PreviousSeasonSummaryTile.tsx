import { Box } from '@metamask/design-system-react-native';
import React, { PropsWithChildren } from 'react';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

interface PreviousSeasonSummaryTileProps extends PropsWithChildren {
  twClassName?: string;
  isLoading?: boolean;
  loadingHeight?: number;
  testID?: string;
}
const PreviousSeasonSummaryTile = ({
  twClassName,
  children,
  isLoading,
  loadingHeight,
  testID,
}: PreviousSeasonSummaryTileProps) => (
  <Box twClassName={`bg-section rounded-lg p-4 ${twClassName}`} testID={testID}>
    {isLoading ? (
      <Skeleton height={loadingHeight || '100%'} width="100%" />
    ) : (
      children
    )}
  </Box>
);

export default PreviousSeasonSummaryTile;
