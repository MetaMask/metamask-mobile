/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import SkeletonText from '../FiatOnRampAggregator/components/SkeletonText';
import { TokenI } from '../Tokens/types';

interface AssetElementProps {
  children?: React.ReactNode;
  asset: TokenI;
  onPress?: (asset: TokenI) => void;
  onLongPress?: (asset: TokenI) => void;
  balance?: string;
}

const createStyles = () =>
  StyleSheet.create({
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    arrow: {
      flex: 1,
      alignSelf: 'flex-end',
    },
    arrowIcon: {
      marginTop: 16,
    },
    skeleton: {
      width: 50,
    },
  });

/**
 * Customizable view to render assets in lists
 */
const AssetElement: React.FC<AssetElementProps> = ({
  children,
  balance,
  asset,
  onPress,
  onLongPress,
}) => {
  const styles = createStyles();

  const handleOnPress = () => {
    onPress?.(asset);
  };

  const handleOnLongPress = () => {
    onLongPress?.(asset);
  };

  return (
    <TouchableOpacity
      onPress={handleOnPress}
      onLongPress={handleOnLongPress}
      style={styles.itemWrapper}
    >
      {children}

      {balance && (
        <Text
          variant={
            !asset?.balanceError ? TextVariant.BodyLGMedium : TextVariant.BodySM
          }
        >
          {balance === 'loading' ? (
            <SkeletonText thin style={styles.skeleton} />
          ) : (
            balance
          )}
        </Text>
      )}
    </TouchableOpacity>
  );
};
export default AssetElement;
