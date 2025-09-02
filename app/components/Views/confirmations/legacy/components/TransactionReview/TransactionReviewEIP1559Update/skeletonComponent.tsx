import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../../../util/theme';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import createStyles from './styles';
import { SkeletonProps } from './types';

const SkeletonComponent = ({ width, noStyle }: SkeletonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <View style={[!noStyle && styles.valuesContainer] as any}>
      <SkeletonPlaceholder>
        <SkeletonPlaceholder.Item width={width} height={10} borderRadius={4} />
      </SkeletonPlaceholder>
    </View>
  );
};

export default SkeletonComponent;
