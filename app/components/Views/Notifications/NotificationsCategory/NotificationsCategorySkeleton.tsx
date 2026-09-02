import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { NotificationsCategorySelectorsIDs } from './NotificationsCategory.testIds';

// Matches FilterButton's Sm size (h-8 / rounded-lg) so the shimmer doesn't
// jump in size once the real tabs replace it.
const PILL_HEIGHT = 32;
const PILL_WIDTHS = [56, 96, 88, 108];
const styles = StyleSheet.create({
  pill: { borderRadius: 8 },
});

const NotificationsCategorySkeleton = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    twClassName="gap-2 px-4 py-1"
    testID={NotificationsCategorySelectorsIDs.SKELETON}
  >
    {PILL_WIDTHS.map((width, index) => (
      <View key={index} style={styles.pill}>
        <Skeleton width={width} height={PILL_HEIGHT} />
      </View>
    ))}
  </Box>
);

export default NotificationsCategorySkeleton;
