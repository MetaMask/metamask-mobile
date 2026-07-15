import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  useLinkedOffDeviceAccounts,
  type OffDeviceAccount,
} from './useLinkedOffDeviceAccounts';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { AuthorizationFailedError } from '../../../../core/Engine/controllers/rewards-controller/services/rewards-data-service';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../reducers/rewards';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  resetRewardsState: jest.fn(),
  setCandidateSubscriptionId: jest.fn(),
}));

describe('useLinkedOffDeviceAccounts', () => {
  const mockDispatch = jest.fn();
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseInvalidateByRewardEvents =
    useInvalidateByRewardEvents as jest.MockedFunction<
      typeof useInvalidateByRewardEvents
    >;
  const mockResetRewardsState = resetRewardsState as jest.MockedFunction<
    typeof resetRewardsState
  >;
  const mockSetCandidateSubscriptionId =
    setCandidateSubscriptionId as jest.MockedFunction<
      typeof setCandidateSubscriptionId
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockResetRewardsState.mockReturnValue({
      type: 'rewards/resetRewardsState',
      payload: undefined,
    });
    mockSetCandidateSubscriptionId.mockReturnValue({
      type: 'rewards/setCandidateSubscriptionId',
      payload: 'retry',
    });
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) return 'sub-123';
      return undefined;
    });
  });

  describe('initial state', () => {
    it('returns an empty array initially', () => {
      const { result } = renderHook(() => useLinkedOffDeviceAccounts());

      expect(result.current).toEqual([]);
    });
  });

  describe('fetching accounts', () => {
    it('calls Engine controller with the subscription ID', async () => {
      const mockCaip10Accounts = [
        'eip155:1:0xabc1234567890abcdef1234567890abcdef12345',
      ];
      mockEngineCall.mockResolvedValueOnce(mockCaip10Accounts);

      renderHook(() => useLinkedOffDeviceAccounts());

      await act(async () => {
        const focusCallback = mockUseFocusEffect.mock.calls[0][0];
        await focusCallback();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getOffDeviceSubscriptionAccounts',
        'sub-123',
      );
    });

    it('parses CAIP-10 accounts into OffDeviceAccount objects', async () => {
      const mockCaip10Accounts = [
        'eip155:1:0xabc1234567890abcdef1234567890abcdef12345',
        'eip155:137:0xdef9876543210fedcba9876543210fedcba98765',
      ];
      mockEngineCall.mockResolvedValueOnce(mockCaip10Accounts);

      const { result } = renderHook(() => useLinkedOffDeviceAccounts());

      await act(async () => {
        const focusCallback = mockUseFocusEffect.mock.calls[0][0];
        await focusCallback();
      });

      const expected: OffDeviceAccount[] = [
        {
          caip10: 'eip155:1:0xabc1234567890abcdef1234567890abcdef12345',
          caipChainId: 'eip155:1',
          address: '0xabc1234567890abcdef1234567890abcdef12345',
        },
        {
          caip10: 'eip155:137:0xdef9876543210fedcba9876543210fedcba98765',
          caipChainId: 'eip155:137',
          address: '0xdef9876543210fedcba9876543210fedcba98765',
        },
      ];
      expect(result.current).toEqual(expected);
    });

    it('returns empty array when subscriptionId is null', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectRewardsSubscriptionId) return null;
        return undefined;
      });

      const { result } = renderHook(() => useLinkedOffDeviceAccounts());

      await act(async () => {
        const focusCallback = mockUseFocusEffect.mock.calls[0][0];
        await focusCallback();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current).toEqual([]);
    });

    it('skips entries with no colon in the CAIP-10 string', async () => {
      const mockCaip10Accounts = [
        'invalid-no-colon',
        'eip155:1:0xabc1234567890abcdef1234567890abcdef12345',
      ];
      mockEngineCall.mockResolvedValueOnce(mockCaip10Accounts);

      const { result } = renderHook(() => useLinkedOffDeviceAccounts());

      await act(async () => {
        const focusCallback = mockUseFocusEffect.mock.calls[0][0];
        await focusCallback();
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].caip10).toBe(
        'eip155:1:0xabc1234567890abcdef1234567890abcdef12345',
      );
    });
  });

  describe('error handling', () => {
    it('sets empty array and triggers auth recovery on AuthorizationFailedError', async () => {
      mockEngineCall.mockRejectedValueOnce(
        new AuthorizationFailedError('Rewards authorization failed'),
      );

      const { result } = renderHook(() => useLinkedOffDeviceAccounts());

      await act(async () => {
        const focusCallback = mockUseFocusEffect.mock.calls[0][0];
        await focusCallback();
      });

      expect(result.current).toEqual([]);
      expect(mockDispatch).toHaveBeenCalledWith(mockResetRewardsState());
      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('retry'),
      );
    });

    it('sets empty array and does NOT dispatch auth actions on generic errors', async () => {
      mockEngineCall.mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useLinkedOffDeviceAccounts());

      await act(async () => {
        const focusCallback = mockUseFocusEffect.mock.calls[0][0];
        await focusCallback();
      });

      expect(result.current).toEqual([]);
      expect(mockDispatch).not.toHaveBeenCalledWith(mockResetRewardsState());
      expect(mockDispatch).not.toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('retry'),
      );
    });
  });

  describe('useFocusEffect integration', () => {
    it('registers a focus effect callback', () => {
      renderHook(() => useLinkedOffDeviceAccounts());

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('useInvalidateByRewardEvents integration', () => {
    it('registers RewardsController:accountLinked as an invalidation event', () => {
      renderHook(() => useLinkedOffDeviceAccounts());

      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:accountLinked'],
        expect.any(Function),
      );
    });
  });
});
