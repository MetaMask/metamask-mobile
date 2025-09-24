import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useCandidateSubscriptionId } from './useCandidateSubscriptionId';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import Logger from '../../../../util/Logger';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../actions/rewards', () => ({
  setCandidateSubscriptionId: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useCandidateSubscriptionId', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockSetCandidateSubscriptionId =
    setCandidateSubscriptionId as jest.MockedFunction<
      typeof setCandidateSubscriptionId
    >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;

  const mockAccount = {
    id: 'account-1',
    address: '0x123456789abcdef',
    metadata: {
      name: 'Account 1',
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    mockSetCandidateSubscriptionId.mockImplementation((id) => ({
      type: 'rewards/setCandidateSubscriptionId',
      payload: id,
    }));
  });

  describe('when account does not exist', () => {
    it('should not fetch candidate subscription ID', () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(null) // selectSelectedInternalAccount
        .mockReturnValueOnce(false) // selectRewardsActiveAccountHasOptedIn
        .mockReturnValueOnce(null); // selectRewardsSubscriptionId

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockLoggerLog).not.toHaveBeenCalled();
    });
  });

  describe('when account has opted in', () => {
    it('should not fetch candidate subscription ID', () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(true) // selectRewardsActiveAccountHasOptedIn
        .mockReturnValueOnce(null); // selectRewardsSubscriptionId

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockLoggerLog).not.toHaveBeenCalled();
    });
  });

  describe('when subscription ID already exists', () => {
    it('should not fetch candidate subscription ID', () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(false) // selectRewardsActiveAccountHasOptedIn
        .mockReturnValueOnce('existing-subscription-id'); // selectRewardsSubscriptionId

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockLoggerLog).not.toHaveBeenCalled();
    });
  });

  describe('when account exists and has not opted in', () => {
    it('should fetch candidate subscription ID successfully when opt-in status is false', async () => {
      // Arrange
      const mockCandidateId = 'candidate-123';
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(false) // selectRewardsActiveAccountHasOptedIn
        .mockReturnValueOnce(null); // selectRewardsSubscriptionId

      mockEngineCall.mockResolvedValueOnce(mockCandidateId);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useCandidateSubscriptionId: Getting candidate subscription ID',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockSetCandidateSubscriptionId).toHaveBeenCalledWith(
        mockCandidateId,
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setCandidateSubscriptionId',
        payload: mockCandidateId,
      });
    });

    it('should fetch candidate subscription ID successfully when opt-in status is null', async () => {
      // Arrange
      const mockCandidateId = 'candidate-456';
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(null) // selectRewardsActiveAccountHasOptedIn
        .mockReturnValueOnce(null); // selectRewardsSubscriptionId

      mockEngineCall.mockResolvedValueOnce(mockCandidateId);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useCandidateSubscriptionId: Getting candidate subscription ID',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockSetCandidateSubscriptionId).toHaveBeenCalledWith(
        mockCandidateId,
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setCandidateSubscriptionId',
        payload: mockCandidateId,
      });
    });

    it('should handle errors when fetching candidate subscription ID fails', async () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(false) // selectRewardsActiveAccountHasOptedIn
        .mockReturnValueOnce(null); // selectRewardsSubscriptionId

      mockEngineCall.mockRejectedValueOnce(new Error('Failed to fetch'));

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useCandidateSubscriptionId: Getting candidate subscription ID',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockSetCandidateSubscriptionId).toHaveBeenCalledWith('error');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setCandidateSubscriptionId',
        payload: 'error',
      });
    });
  });
});
