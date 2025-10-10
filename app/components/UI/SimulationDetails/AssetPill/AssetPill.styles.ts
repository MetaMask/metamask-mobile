import { StyleSheet } from 'react-native';
import sharedStyles from '../shared.styles';

const styleSheet = () =>
  StyleSheet.create({
    nativeAssetPill: {
      ...sharedStyles.pill,
    },
    assetPill: {
      flexShrink: 1,
      flexBasis: 'auto',
      minWidth: 0,
    },
  });

export default styleSheet;
