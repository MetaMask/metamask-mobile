import { StyleSheet } from 'react-native';
import { RING_SIZE, TOKEN_ICON_SIZE } from './TokenIconWithSpinner.constants';

const styles = StyleSheet.create({
  tokenIconWithRingContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spinningRingWrapper: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  tokenIconWrapper: {
    position: 'absolute',
  },
  tokenIcon: {
    width: TOKEN_ICON_SIZE,
    height: TOKEN_ICON_SIZE,
    borderRadius: TOKEN_ICON_SIZE / 2,
  },
});

export default styles;
