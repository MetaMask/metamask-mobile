import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

// Visual padding added to bottom safe area inset
export const BOTTOM_VISUAL_PADDING = 22;

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      // paddingBottom is set dynamically in component using useSafeAreaInsets()
      // to properly handle Android 3-button navigation
    },
  });

export default styleSheet;
