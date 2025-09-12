import React from 'react';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './skeleton-row.styles';

export function SkeletonRow() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      <Skeleton width={150} height={22} style={styles.skeleton} />
      <Skeleton width={100} height={22} style={styles.skeleton} />
    </Box>
  );
}
