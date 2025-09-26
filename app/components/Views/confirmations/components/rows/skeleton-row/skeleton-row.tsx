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

export interface SkeletonRowProps {
  testId?: string;
}

export function SkeletonRow({ testId }: SkeletonRowProps) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
      style={styles.container}
      testID={testId}
    >
      <Skeleton width={150} height={22} style={styles.skeleton} />
      <Skeleton width={100} height={22} style={styles.skeleton} />
    </Box>
  );
}
