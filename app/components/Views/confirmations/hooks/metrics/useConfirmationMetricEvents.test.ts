import { TransactionMeta } from '@metamask/transaction-controller';
import { SignatureRequest } from '@metamask/signature-controller';
import { renderHook } from '@testing-library/react-hooks';
import {
  CONFIRMATION_EVENTS,
  CONFIRMATION_EVENT_LOCATIONS,
  TOOLTIP_TYPES,
} from '../../../../../core/Analytics/events/confirmations';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { useConfirmationLocation } from '../metrics/useConfirmationLocation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));
jest.mock('../../../../../core/redux/slices/confirmationMetrics');
jest.mock('../../../../hooks/useMetrics');
jest.mock('../metrics/useConfirmationLocation');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../signatures/useSignatureRequest');

const MOCK_LOCATION = 'test-location';
const MOCK_TRANSACTION_META = {
  id: 'mockTransactionId',
  chainId: 'mockChainId',
  status: 'mockStatus',
} as unknown as TransactionMeta;
const MOCK_SIGNATURE_REQUEST = {
  id: 'mockSignatureRequestId',
  status: 'mockStatus',
} as unknown as SignatureRequest;

describe('useConfirmationMetricEvents', () => {
  const mockCreateEventBuilder = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockAddProperties = jest.fn();
  const mockAddSensitiveProperties = jest.fn();
  const mockBuild = jest.fn();
  const mockUseConfirmationLocation = jest.mocked(useConfirmationLocation);
  const mockUpdateConfirmationMetric = jest.mocked(updateConfirmationMetric);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseSignatureRequest = jest.mocked(useSignatureRequest);

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
    mockUseSignatureRequest.mockReturnValue(undefined);
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
      tooltip: 'test_tooltip' as TOOLTIP_TYPES,
    };

    mockBuild.mockReturnValue(expectedProperties);

    const { result } = renderHook(() => useConfirmationMetricEvents());

    result.current.trackTooltipClickedEvent({
      tooltip: 'test_tooltip' as TOOLTIP_TYPES,
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

  describe('setConfirmationMetric callback', () => {
    it('calls updateConfirmationMetric when transactionMeta is present', () => {
      const { result } = renderHook(() => useConfirmationMetricEvents());

      result.current.setConfirmationMetric({
        properties: {
          transaction_amount_eth: '1.0',
        },
      });

      expect(mockUpdateConfirmationMetric).toHaveBeenCalledWith({
        id: MOCK_TRANSACTION_META.id,
        params: {
          properties: {
            transaction_amount_eth: '1.0',
          },
        },
      });
    });

    it('calls updateConfirmationMetric when signatureRequest is present', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);
      mockUseSignatureRequest.mockReturnValue(MOCK_SIGNATURE_REQUEST);

      const { result } = renderHook(() => useConfirmationMetricEvents());

      result.current.setConfirmationMetric({
        properties: {
          signature_specific_property: 'signature-specific-value',
        },
      });

      expect(mockUpdateConfirmationMetric).toHaveBeenCalledWith({
        id: MOCK_SIGNATURE_REQUEST.id,
        params: {
          properties: {
            signature_specific_property: 'signature-specific-value',
          },
        },
      });
    });
  });
});
