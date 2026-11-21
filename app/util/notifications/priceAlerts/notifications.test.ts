import notifee, { AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';
import { onBackgroundPriceAlertMessage } from './notifications';
import threshold from './samples/threshold.fcm.json';
import { writeSparkline } from './sparkline';

jest.mock('./sparkline');

const { data } = threshold.message;
const display = jest.mocked(notifee.displayNotification);
const chart = jest.mocked(writeSparkline);

describe('onBackgroundPriceAlertMessage', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it('posts a single rich alert for a v1 data-only delivery', async () => {
    chart.mockResolvedValueOnce('file:///cache/threshold.png');

    await onBackgroundPriceAlertMessage({ data });

    expect(display).toHaveBeenCalledTimes(1);
    expect(display).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'ETH  ·  $4,036.42',
        body: 'Above $4,000 · <font color="#16794F"><b>▲ +3.1%</b></font>',
        android: expect.objectContaining({
          style: expect.objectContaining({
            type: AndroidStyle.BIGPICTURE,
            picture: 'file:///cache/threshold.png',
          }),
          actions: [
            expect.objectContaining({ title: 'View token' }),
            expect.objectContaining({ title: 'Swap' }),
          ],
        }),
      }),
    );
  });

  it('does not duplicate a notification already delivered by the OS', async () => {
    const notification = {
      title: data.fallback_title,
      body: data.fallback_body,
    };

    await onBackgroundPriceAlertMessage({ data, notification });

    expect(display).not.toHaveBeenCalled();
  });

  it('posts plain copy and preserves the fallback link when chart rendering fails', async () => {
    chart.mockRejectedValueOnce(new Error('Disk write failed'));

    await onBackgroundPriceAlertMessage({ data });

    expect(display).toHaveBeenCalledTimes(1);
    expect(display).toHaveBeenCalledWith(
      expect.objectContaining({
        title: data.fallback_title,
        body: data.fallback_body,
        data: expect.objectContaining({ deeplink: data.deeplink }),
        android: expect.not.objectContaining({ style: expect.anything() }),
      }),
    );
  });
});
