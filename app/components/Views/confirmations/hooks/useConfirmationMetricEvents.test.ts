import { TransactionMeta } from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import {
  CONFIRMATION_EVENTS,
  CONFIRMATION_EVENT_LOCATIONS,
} from '../../../../core/Analytics/events/confirmations';
import { updateTransactionMetrics } from '../../../../core/redux/slices/transactionMetrics';
import { useMetrics } from '../../../hooks/useMetrics';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { useConfirmationLocation } from './useConfirmationLocation';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));
jest.mock('../../../../core/redux/slices/transactionMetrics');
jest.mock('../../../hooks/useMetrics');
jest.mock('./useConfirmationLocation');
jest.mock('./useTransactionMetadataRequest');

const MOCK_LOCATION = 'test-location';
const MOCK_TRANSACTION_META = {
  id: 'mockTransactionId',
  chainId: 'mockChainId',
  status: 'mockStatus',
} as unknown as TransactionMeta;

describe('useConfirmationMetricEvents', () => {
  const mockCreateEventBuilder = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockAddProperties = jest.fn();
  const mockAddSensitiveProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockUseConfirmationLocation = jest.mocked(useConfirmationLocation);
  const mockUpdateTransactionMetrics = jest.mocked(updateTransactionMetrics);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

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

    mockUseConfirmationLocation.mockReturnValue(
      MOCK_LOCATION as CONFIRMATION_EVENT_LOCATIONS,
    );

    mockUseTransactionMetadataRequest.mockReturnValue(MOCK_TRANSACTION_META);
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

  it('setTransactionMetrics callback calls updateTransactionMetrics', () => {
    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.setTransactionMetrics({
      properties: {
        transaction_amount_eth: '1.0',
      },
    });

    expect(mockUpdateTransactionMetrics).toHaveBeenCalledWith({
      transactionId: MOCK_TRANSACTION_META.id,
      params: {
        properties: {
          transaction_amount_eth: '1.0',
        },
      },
    });
  });
});
