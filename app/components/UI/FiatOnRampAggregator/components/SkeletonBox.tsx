import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      padding: 18,
      borderRadius: 6,
      backgroundColor: colors.background.alternative,
    },
  });

interface Props {
  style?: StyleProp<ViewStyle>;
  thin?: boolean;
}

const SkeletonBox: React.FC<Props> = ({ style, ...props }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <>
      <View style={[styles.wrapper, style]} {...props} />
    </>
  );
};

export default SkeletonBox;
