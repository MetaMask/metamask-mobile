import notifee from '@notifee/react-native';
import {
  displayPriceAlert,
  onBackgroundPriceAlertMessage,
} from '../notifications';
import { PRICE_ALERT_VERSION } from '../payload';

import threshold from './threshold.fcm.json';
import thresholdBelow from './threshold-below.fcm.json';
import movement from './movement.fcm.json';
import movementUp from './movement-up.fcm.json';

const samples = {
  threshold: threshold.message.data,
  'threshold-below': thresholdBelow.message.data,
  movement: movement.message.data,
  'movement-up': movementUp.message.data,
};

type Sample =
  | keyof typeof samples
  | 'fallback'
  | 'malformed'
  | 'no-chart'
  | 'invalid-chart';

export async function showPriceAlertSample(
  sample: Sample,
  delivery: 'local' | 'android-background' = 'local',
) {
  if (!__DEV__) {
    return;
  }
  const { chart: _chart, ...withoutChart } = samples.threshold;
  const variants = {
    fallback: { ...withoutChart, mm_ui: 'price_alert@2' },
    malformed: { ...withoutChart, mm_ui: PRICE_ALERT_VERSION, price: '' },
    'no-chart': withoutChart,
    'invalid-chart': { ...withoutChart, chart: '{"v":99}' },
  };
  const data = { ...samples, ...variants }[sample];
  await notifee.requestPermission();
  const display =
    delivery === 'android-background'
      ? onBackgroundPriceAlertMessage
      : displayPriceAlert;
  await display({ data });
}
