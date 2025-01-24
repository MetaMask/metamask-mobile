import { StyleSheet } from 'react-native';

import Device from '../../../../util/device';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 24,
      minHeight: '70%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      justifyContent: 'space-between',
    },
  });
};

export default styleSheet;
