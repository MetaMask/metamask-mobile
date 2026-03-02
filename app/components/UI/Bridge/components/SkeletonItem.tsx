import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../Box/Box';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { FlexDirection, AlignItems } from '../../Box/box.types';
import { Skeleton } from '../../../../component-library/components/Skeleton';

const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    skeletonCircle: {
      borderRadius: 15,
    },
    skeletonItemContainer: {
      paddingLeft: 18,
      paddingRight: 10,
      paddingVertical: 12,
    },
    // Need the flex 1 to make sure this doesn't disappear when FlexDirection.Row is used
    skeletonItemRows: {
      flex: 1,
    },
  });

export const SkeletonItem = React.memo(() => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Box
      gap={16}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      style={styles.skeletonItemContainer}
    >
      <Skeleton height={30} width={30} style={styles.skeletonCircle} />

      <Box gap={4} style={styles.skeletonItemRows}>
        <Skeleton height={24} width={'96%'} />
        <Skeleton height={24} width={'37%'} />
      </Box>
    </Box>
  );
});
