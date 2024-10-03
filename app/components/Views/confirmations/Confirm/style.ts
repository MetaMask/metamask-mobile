import { StyleSheet } from 'react-native';

import Device from '../../../../util/device';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 24,
      minHeight: '60%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      justifyContent: 'space-between'
    },
  });

export default createStyles;
