import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      padding: 14,
      borderRadius: 30,
      backgroundColor: colors.background.alternative,
    },
    thin: {
      padding: 8,
    },
    thick: {
      padding: 20,
    },
    large: {
      width: '75%',
    },
    medium: {
      width: '50%',
    },
    small: {
      width: '30%',
    },
    smaller: {
      width: '20%',
    },
    center: {
      alignSelf: 'center',
    },
    spacingVertical: {
      marginVertical: 10,
    },
    spacingHorizontal: {
      marginHorizontal: 15,
    },
    spacingTop: {
      marginTop: 35,
    },
    spacingBottom: {
      marginBottom: 25,
    },
    spacingTopSmall: {
      marginTop: 10,
    },
    title: {
      paddingRight: 100,
    },
  });

interface Props {
  style?: StyleProp<ViewStyle>;
  thin?: boolean;
  thick?: boolean;
  large?: boolean;
  medium?: boolean;
  small?: boolean;
  smaller?: boolean;
  center?: boolean;
  spacingVertical?: boolean;
  spacingHorizontal?: boolean;
  spacingBottom?: boolean;
  spacingTop?: boolean;
  spacingTopSmall?: boolean;
  title?: boolean;
}

const SkeletonText: React.FC<Props> = ({
  style,
  thin,
  thick,
  spacingVertical,
  spacingHorizontal,
  spacingBottom,
  spacingTop,
  spacingTopSmall,
  center,
  large,
  medium,
  small,
  smaller,
  title,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View
      style={[
        styles.wrapper,
        thin && styles.thin,
        thick && styles.thick,
        large && styles.large,
        medium && styles.medium,
        small && styles.small,
        smaller && styles.smaller,
        center && styles.center,
        spacingVertical && styles.spacingVertical,
        spacingHorizontal && styles.spacingHorizontal,
        spacingBottom && styles.spacingBottom,
        spacingTop && styles.spacingTop,
        spacingTopSmall && styles.spacingTopSmall,
        title && styles.title,
        style,
      ]}
    />
  );
};

export default SkeletonText;
