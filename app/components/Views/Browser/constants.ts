import { Dimensions } from 'react-native';
import Device from '../../../util/device';

const margin = 16;

export const THUMB_WIDTH = Dimensions.get('window').width / 2 - margin * 2;
export const THUMB_HEIGHT = Device.isIos()
  ? THUMB_WIDTH * 1.81
  : THUMB_WIDTH * 1.48;

export const IDLE_TIME_MAX = 1000 * 60 * 2.5; // 2.5 minutes
export const IDLE_TIME_CALC_INTERVAL = 1000 * 30; // 30 seconds
