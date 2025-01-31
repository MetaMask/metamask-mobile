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
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      maxHeight: '90%',
    },
    scrollableSection: {
      padding: 4,
    },
    scrollable: {
      minHeight: '100%',
    },
    scrollWrapper: {
      minHeight: '75%',
      maxHeight: '75%',
      margin: 0,
    },
  });
};

export default styleSheet;
