import { trackWidgetAdoption } from './trackWidgetAdoption';
import { getInstalledWidgets } from './getInstalledWidgets';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Logger from '../../util/Logger';

jest.mock('./getInstalledWidgets');
jest.mock('../../util/analytics/analytics');
jest.mock('../../util/analytics/AnalyticsEventBuilder');
jest.mock('../../util/Logger');

const mockedGetInstalledWidgets = jest.mocked(getInstalledWidgets);
const mockedAnalytics = analytics as jest.Mocked<typeof analytics>;
const mockedAnalyticsEventBuilder = AnalyticsEventBuilder as jest.Mocked<
  typeof AnalyticsEventBuilder
>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('trackWidgetAdoption', () => {
  const mockEventBuilder = {
    addProperties: jest.fn(),
    build: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAnalyticsEventBuilder.createEventBuilder.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.addProperties.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.build.mockReturnValue({ event: 'test' });
  });

  it('reports zero widgets when none are installed', async () => {
    mockedGetInstalledWidgets.mockResolvedValue([]);

    await trackWidgetAdoption();

    expect(mockedAnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WIDGETS_ADOPTION,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      widget_count: 0,
      widget_kinds: [],
      widget_families: [],
    });
    expect(mockedAnalytics.trackEvent).toHaveBeenCalledWith({
      event: 'test',
    });
    expect(mockedAnalytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_WIDGETS_INSTALLED]: false,
      [UserProfileProperty.WIDGETS_INSTALLED_COUNT]: 0,
    });
  });

  it('reports a single installed widget', async () => {
    mockedGetInstalledWidgets.mockResolvedValue([
      { kind: 'BalanceWidget', family: 'systemSmall' },
    ]);

    await trackWidgetAdoption();

    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      widget_count: 1,
      widget_kinds: ['BalanceWidget'],
      widget_families: ['systemSmall'],
    });
    expect(mockedAnalytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_WIDGETS_INSTALLED]: true,
      [UserProfileProperty.WIDGETS_INSTALLED_COUNT]: 1,
    });
  });

  it('de-duplicates repeated kinds/families across multiple installed widgets', async () => {
    mockedGetInstalledWidgets.mockResolvedValue([
      { kind: 'BalanceWidget', family: 'systemSmall' },
      { kind: 'BalanceWidget', family: 'systemMedium' },
      { kind: 'BalanceWidget', family: 'systemSmall' },
    ]);

    await trackWidgetAdoption();

    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      widget_count: 3,
      widget_kinds: ['BalanceWidget'],
      widget_families: ['systemSmall', 'systemMedium'],
    });
    expect(mockedAnalytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_WIDGETS_INSTALLED]: true,
      [UserProfileProperty.WIDGETS_INSTALLED_COUNT]: 3,
    });
  });

  it('logs and does not throw when the native call rejects', async () => {
    mockedGetInstalledWidgets.mockRejectedValue(new Error('native failure'));

    await expect(trackWidgetAdoption()).resolves.toBeUndefined();

    expect(mockedAnalytics.trackEvent).not.toHaveBeenCalled();
    expect(mockedAnalytics.identify).not.toHaveBeenCalled();
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error tracking widget adoption - analytics tracking failed',
    );
  });

  it('logs and does not throw when trackEvent itself fails', async () => {
    mockedGetInstalledWidgets.mockResolvedValue([]);
    mockedAnalytics.trackEvent.mockImplementation(() => {
      throw new Error('tracking failed');
    });

    await expect(trackWidgetAdoption()).resolves.toBeUndefined();

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error tracking widget adoption - analytics tracking failed',
    );
  });
});
