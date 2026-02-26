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
      {(
        [
          ['35%', '42%'],
          ['28%', '24%'],
          ['30%', '18%'],
          ['32%', '22%'],
        ] as const
      ).map(([left, right], i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={left} height={18} />
          <Skeleton width={right} height={18} />
        </View>
      ))}
    </View>
  );
};

export default QuoteDetailsCardSkeleton;
