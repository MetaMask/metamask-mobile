import { withMetaMetrics } from './withMetaMetrics';
import { MetaMetrics } from '../../../../../core/Analytics';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';

describe('withMetaMetrics', () => {
  let trackEventSpy: jest.SpyInstance;

  const MOCK_HANDLER_RESULT = 123;
  const mockHandler = () => MOCK_HANDLER_RESULT;
  const mockAsyncHandler = async () => MOCK_HANDLER_RESULT;

  beforeEach(() => {
    jest.resetAllMocks();
    trackEventSpy = jest.spyOn(MetaMetrics.getInstance(), 'trackEvent');
  });

  it('fires single event when wrapping sync function', () => {
    const mockHandlerWithMetaMetrics = withMetaMetrics(mockHandler, {
      event: MetaMetricsEvents.STAKE_BUTTON_CLICKED,
      properties: {
        sample: 'value',
      },
    });

    const result = mockHandlerWithMetaMetrics();

    expect(result).toEqual(MOCK_HANDLER_RESULT);
    expect(trackEventSpy).toHaveBeenCalledTimes(1);
  });

  it('fires array of events when wrapping sync function', () => {
    const mockHandlerWithMetaMetrics = withMetaMetrics(mockHandler, [
      {
        event: MetaMetricsEvents.TOOLTIP_OPENED,
        properties: {
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Tooltip Opened',
          location: EVENT_LOCATIONS.UNIT_TEST,
          tooltip_name: 'Test Tooltip 1',
        },
      },
      {
        event: MetaMetricsEvents.TOOLTIP_OPENED,
        properties: {
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Tooltip Opened',
          location: EVENT_LOCATIONS.UNIT_TEST,
          tooltip_name: 'Test Tooltip 2',
        },
      },
    ]);

    const result = mockHandlerWithMetaMetrics();
    expect(result).toEqual(MOCK_HANDLER_RESULT);
    expect(trackEventSpy).toHaveBeenCalledTimes(2);
  });

  it('fires single event when wrapping async function', async () => {
    const mockAsyncHandlerWithMetaMetrics = withMetaMetrics(mockAsyncHandler, {
      event: MetaMetricsEvents.STAKE_BUTTON_CLICKED,
      properties: {
        sample: 'value',
      },
    });

    const result = await mockAsyncHandlerWithMetaMetrics();

    expect(result).toEqual(MOCK_HANDLER_RESULT);
    expect(trackEventSpy).toHaveBeenCalledTimes(1);
  });

  it('fires all events when wrapping async function', async () => {
    const mockAsyncHandlerWithMetaMetrics = withMetaMetrics(mockAsyncHandler, [
      {
        event: MetaMetricsEvents.TOOLTIP_OPENED,
        properties: {
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Tooltip Opened',
          location: EVENT_LOCATIONS.UNIT_TEST,
          tooltip_name: 'Test Tooltip 1',
        },
      },
      {
        event: MetaMetricsEvents.TOOLTIP_OPENED,
        properties: {
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Tooltip Opened',
          location: EVENT_LOCATIONS.UNIT_TEST,
          tooltip_name: 'Test Tooltip 2',
        },
      },
    ]);

    const result = await mockAsyncHandlerWithMetaMetrics();

    expect(result).toEqual(MOCK_HANDLER_RESULT);
    expect(trackEventSpy).toHaveBeenCalledTimes(2);
  });
});
