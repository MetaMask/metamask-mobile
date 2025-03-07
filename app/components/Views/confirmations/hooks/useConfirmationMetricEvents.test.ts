import { renderHook } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useMetrics } from '../../../hooks/useMetrics';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';

jest.mock('../../../hooks/useMetrics');

describe('useConfirmationMetricEvents', () => {
  const mockCreateEventBuilder = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockAddProperties = jest.fn();
  const mockAddSensitiveProperties = jest.fn();
  const mockBuild = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties.mockReturnValue({
        addSensitiveProperties: mockAddSensitiveProperties.mockReturnValue({
          build: mockBuild,
        }),
      }),
    });

    (useMetrics as jest.Mock).mockReturnValue({
      createEventBuilder: mockCreateEventBuilder,
      trackEvent: mockTrackEvent,
    });
  });

  it('tracks advanced details toggled event', () => {
    const expectedProperties = {
      location: 'test-location',
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackAdvancedDetailsToggledEvent({
      location: 'test-location',
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CONFIRMATION_ADVANCED_DETAILS_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: 'test-location',
    });
    expect(mockAddSensitiveProperties).toHaveBeenCalledWith({});
    expect(mockBuild).toHaveBeenCalled();
  });

  it('tracks tooltip clicked event', () => {
    const expectedProperties = {
      location: 'test-location',
      tooltip: 'test-tooltip',
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackTooltipClickedEvent({
      location: 'test-location',
      tooltip: 'test-tooltip',
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CONFIRMATION_TOOLTIP_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(expectedProperties);
    expect(mockAddSensitiveProperties).toHaveBeenCalledWith({});
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedProperties);
  });

  it('tracks page viewed event', () => {
    const expectedProperties = {
      location: 'test-location',
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackPageViewedEvent({
      location: 'test-location',
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CONFIRMATION_PAGE_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(expectedProperties);
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedProperties);
  });
});
