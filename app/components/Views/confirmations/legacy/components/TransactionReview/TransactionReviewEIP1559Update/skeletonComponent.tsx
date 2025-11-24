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
    // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
    // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
    <View style={[!noStyle && styles.valuesContainer]}>
      <SkeletonPlaceholder>
        <SkeletonPlaceholder.Item width={width} height={10} borderRadius={4} />
      </SkeletonPlaceholder>
    </View>
  );
};

export default SkeletonComponent;
