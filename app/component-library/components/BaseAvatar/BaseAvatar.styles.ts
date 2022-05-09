import { StyleSheet } from 'react-native';
import { BaseAvatarStyleSheetVars } from './BaseAvatar.types';

const createStyleSheet = ({ size }: BaseAvatarStyleSheetVars) =>
  StyleSheet.create({
    container: {
      height: size,
      width: size,
      borderRadius: size / 2,
      overflow: 'hidden',
    },
  });

export default createStyleSheet;
