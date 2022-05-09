import { StyleSheet } from 'react-native';
import { BaseAvatarStyleSheetVars } from './BaseAvatar.types';

const createStyleSheet = ({ size }: BaseAvatarStyleSheetVars) => {
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    container: {
      height: sizeAsNum,
      width: sizeAsNum,
      borderRadius: sizeAsNum / 2,
      overflow: 'hidden',
    },
  });
};

export default createStyleSheet;
