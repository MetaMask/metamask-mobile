import { StyleSheet } from 'react-native';
import Device from '../../../util/device';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  root: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    rowGap: Device.isMediumDevice() ? 16 : 24,
  },
  ctaContainer: {
    flexDirection: 'column',
    rowGap: Device.isMediumDevice() ? 12 : 16,
    marginBottom: 16,
    width: '100%',
  },
  image: {
    alignSelf: 'center',
    width: Device.isMediumDevice() ? 180 : 240,
    height: Device.isMediumDevice() ? 180 : 240,
  },
  largeFoxWrapper: {
    width: Device.isMediumDevice() ? 180 : 240,
    height: Device.isMediumDevice() ? 180 : 240,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 'auto',
    padding: Device.isMediumDevice() ? 30 : 40,
    marginTop: 16,
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
    rowGap: Device.isMediumDevice() ? 24 : 32,
  },
});

export default styles;
