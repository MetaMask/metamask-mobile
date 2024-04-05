import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const SMALL_DEVICE = Device.isSmallDevice();

export default (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    welcome: {
      fontSize: 20,
    },
    content: {
      ...fontStyles.normal,
      color: colors.primary.inverse,
      fontSize: 14,
      textAlign: 'left',
      marginBottom: SMALL_DEVICE ? 5 : 20,
    },
    contentContainer: {
      marginTop: 20,
    },
    coachmarkLeft: {
      marginLeft: SMALL_DEVICE ? 5 : 10,
      marginRight: SMALL_DEVICE ? 45 : 85,
    },
  });
