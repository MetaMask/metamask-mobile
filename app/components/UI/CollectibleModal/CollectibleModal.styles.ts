import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  round: {
    borderRadius: 12,
  },
  collectibleMediaWrapper: {
    position: 'absolute',
    top: 32,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    marginTop: Device.hasNotch() ? 36 : 16,
    borderRadius: 12,
    backgroundColor: colors.transparent,
  },
});

export default styles;
