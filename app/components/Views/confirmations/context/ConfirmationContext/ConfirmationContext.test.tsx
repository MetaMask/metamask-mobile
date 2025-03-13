import React from 'react';
import { render, act } from '@testing-library/react-native';
import {
  ConfirmContextProvider,
  useConfirmContext,
} from './ConfirmationContext';
import { CONFIRMATION_EVENT_LOCATIONS } from '../../../../../core/Analytics/events/confirmations';
import { determineConfirmationLocation } from './helpers';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../hooks/useTransactionMetadataRequest';

jest.mock('../../hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useTransactionMetadataRequest', () => ({
  __esModule: true,
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('./helpers', () => ({
  determineConfirmationLocation: jest.fn(),
}));

const MOCK_APPROVAL_REQUEST = { id: '123' };
const MOCK_TRANSACTION_META = { id: '456' };
const MOCK_LOCATION = CONFIRMATION_EVENT_LOCATIONS.PERSONAL_SIGN;

const TestConsumer = ({
  onLocationChange,
}: {
  onLocationChange: (location?: CONFIRMATION_EVENT_LOCATIONS) => void;
}) => {
  const { location } = useConfirmContext();

  React.useEffect(() => {
    onLocationChange(location);
  }, [location, onLocationChange]);

  return null;
};

describe('ConfirmContextProvider', () => {
  const mockUseApprovalRequest = jest.mocked(useApprovalRequest);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockDetermineConfirmationLocation = jest.mocked(
    determineConfirmationLocation,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: MOCK_APPROVAL_REQUEST,
    } as unknown as ReturnType<typeof useApprovalRequest>);

    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META as unknown as ReturnType<
        typeof useTransactionMetadataRequest
      >,
    );
    mockDetermineConfirmationLocation.mockReturnValue(MOCK_LOCATION);
  });

  it('provides the initial location from determineConfirmationLocation', () => {
    const onLocationChange = jest.fn();

    render(
      <ConfirmContextProvider>
        <TestConsumer onLocationChange={onLocationChange} />
      </ConfirmContextProvider>,
    );

    expect(determineConfirmationLocation).toHaveBeenCalledWith({
      approvalRequest: MOCK_APPROVAL_REQUEST,
      transactionMeta: MOCK_TRANSACTION_META,
    });

    expect(onLocationChange).toHaveBeenCalledWith(MOCK_LOCATION);
  });

  it('updates location when dependencies change', () => {
    const initialLocation = CONFIRMATION_EVENT_LOCATIONS.STAKING_DEPOSIT;
    const updatedApprovalRequest = { id: '789' };
    const updatedLocation = CONFIRMATION_EVENT_LOCATIONS.STAKING_WITHDRAWAL;

    mockDetermineConfirmationLocation.mockReturnValue(initialLocation);

    const onLocationChange = jest.fn();

    const { rerender } = render(
      <ConfirmContextProvider>
        <TestConsumer onLocationChange={onLocationChange} />
      </ConfirmContextProvider>,
    );

    // Verify initial render
    expect(onLocationChange).toHaveBeenCalledWith(initialLocation);
    expect(determineConfirmationLocation).toHaveBeenCalledWith({
      approvalRequest: MOCK_APPROVAL_REQUEST,
      transactionMeta: MOCK_TRANSACTION_META,
    });

    // Update the approval request and location
    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: updatedApprovalRequest,
    } as unknown as ReturnType<typeof useApprovalRequest>);
    mockDetermineConfirmationLocation.mockReturnValue(updatedLocation);

    // Trigger re-render
    act(() => {
      rerender(
        <ConfirmContextProvider>
          <TestConsumer onLocationChange={onLocationChange} />
        </ConfirmContextProvider>,
      );
    });

    // Verify the location was updated
    expect(determineConfirmationLocation).toHaveBeenCalledWith({
      approvalRequest: updatedApprovalRequest,
      transactionMeta: MOCK_TRANSACTION_META,
    });

    expect(onLocationChange).toHaveBeenCalledWith(updatedLocation);
  });

  it('handles undefined location', () => {
    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: null,
    } as unknown as ReturnType<typeof useApprovalRequest>);
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    mockDetermineConfirmationLocation.mockReturnValue(undefined);

    const onLocationChange = jest.fn();

    render(
      <ConfirmContextProvider>
        <TestConsumer onLocationChange={onLocationChange} />
      </ConfirmContextProvider>,
    );

    expect(onLocationChange).toHaveBeenCalledWith(undefined);
  });
});
