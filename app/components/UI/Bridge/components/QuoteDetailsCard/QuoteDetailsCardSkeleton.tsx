import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

const createStyles = ({
  borderColor,
  backgroundColor,
}: {
  borderColor: string;
  backgroundColor: string;
}) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor,
      gap: 14,
      backgroundColor,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

const QuoteDetailsCardSkeleton = () => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      createStyles({
        borderColor: colors.border.muted,
        backgroundColor: colors.background.default,
      }),
    [colors.background.default, colors.border.muted],
  );

  return (
    <View
      style={styles.container}
      testID={BridgeViewSelectorsIDs.QUOTE_DETAILS_SKELETON}
    >
      <View style={styles.row}>
        <Skeleton width="35%" height={18} />
        <Skeleton width="42%" height={18} />
      </View>
      <View style={styles.row}>
        <Skeleton width="28%" height={18} />
        <Skeleton width="24%" height={18} />
      </View>
      <View style={styles.row}>
        <Skeleton width="30%" height={18} />
        <Skeleton width="18%" height={18} />
      </View>
      <View style={styles.row}>
        <Skeleton width="32%" height={18} />
        <Skeleton width="22%" height={18} />
      </View>
    </View>
  );
};

export default QuoteDetailsCardSkeleton;
