import { renderHook } from '@testing-library/react-hooks';
import { CONFIRMATION_EVENTS } from '../../../../core/Analytics/events/confirmations';
import { useMetrics } from '../../../hooks/useMetrics';
import { useConfirmContext } from '../context/ConfirmationContext/ConfirmationContext';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';

jest.mock('../../../hooks/useMetrics');
jest.mock('../context/ConfirmationContext/ConfirmationContext');

const MOCK_LOCATION = 'test-location';

describe('useConfirmationMetricEvents', () => {
  const mockCreateEventBuilder = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockAddProperties = jest.fn();
  const mockAddSensitiveProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockUseConfirmContext = jest.mocked(useConfirmContext);

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

    mockUseConfirmContext.mockReturnValue({
      location: MOCK_LOCATION,
    } as unknown as ReturnType<typeof useConfirmContext>);
  });

  it('tracks advanced details toggled event', () => {
    const expectedProperties = {
      location: MOCK_LOCATION,
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackAdvancedDetailsToggledEvent({
      location: MOCK_LOCATION,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      CONFIRMATION_EVENTS.ADVANCED_DETAILS_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: MOCK_LOCATION,
    });
    expect(mockAddSensitiveProperties).toHaveBeenCalledWith({});
    expect(mockBuild).toHaveBeenCalled();
  });

  it('tracks tooltip clicked event', () => {
    const expectedProperties = {
      location: MOCK_LOCATION,
      tooltip: 'test-tooltip',
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackTooltipClickedEvent({
      location: MOCK_LOCATION,
      tooltip: 'test-tooltip',
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      CONFIRMATION_EVENTS.TOOLTIP_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(expectedProperties);
    expect(mockAddSensitiveProperties).toHaveBeenCalledWith({});
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedProperties);
  });

  it('tracks page viewed event', () => {
    const expectedProperties = {
      location: MOCK_LOCATION,
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackPageViewedEvent();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      CONFIRMATION_EVENTS.SCREEN_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(expectedProperties);
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedProperties);
  });
});
