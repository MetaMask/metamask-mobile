import { renderHook, act } from '@testing-library/react-hooks';
import { useRewardsAuth } from './useRewardsAuth';
import Engine from '../../../../core/Engine';
import { handleRewardsErrorMessage } from '../utils';
import { useSelector } from 'react-redux';

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

jest.mock(
  '../../../../core/Engine/controllers/rewards-controller/utils/multi-subscription-token-vault',
  () => ({
    getSubscriptionToken: jest.fn(),
  }),
);

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useRewardsAuth', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;

  const mockAccount = {
    address: '0x123',
    scopes: ['eip155:1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector
      .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
      .mockReturnValueOnce('subscription-id') // selectRewardsSubscriptionId
      .mockReturnValueOnce('eip155:1:0x123'); // selectRewardsActiveAccountId
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useRewardsAuth());

    expect(result.current.subscriptionId).toBe('subscription-id');
    expect(result.current.optinLoading).toBe(false);
    expect(result.current.optinError).toBeNull();
    expect(typeof result.current.optin).toBe('function');
    expect(typeof result.current.clearOptinError).toBe('function');
  });

  it('should handle optin successfully', async () => {
    mockEngineCall.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRewardsAuth());

    await act(async () => {
      await result.current.optin({ referralCode: 'TEST123' });
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:optIn',
      mockAccount,
      'TEST123',
    );
  });

  it('should handle optin errors', async () => {
    const mockError = new Error('Optin failed');
    const mockErrorMessage = 'Handled error message';

    mockEngineCall.mockRejectedValueOnce(mockError);
    mockHandleRewardsErrorMessage.mockReturnValueOnce(mockErrorMessage);

    const { result } = renderHook(() => useRewardsAuth());

    await act(async () => {
      await result.current.optin({ referralCode: 'TEST123' });
    });

    expect(result.current.optinError).toBe(mockErrorMessage);
  });

  it('should clear optin error', () => {
    const { result } = renderHook(() => useRewardsAuth());

    act(() => {
      result.current.clearOptinError();
    });

    expect(result.current.optinError).toBeNull();
  });

  it('should return null subscription id when not available', () => {
    mockUseSelector
      .mockReset()
      .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
      .mockReturnValueOnce(null) // selectRewardsSubscriptionId
      .mockReturnValueOnce('eip155:1:0x123'); // selectRewardsActiveAccountId

    const { result } = renderHook(() => useRewardsAuth());

    expect(result.current.subscriptionId).toBeNull();
  });
});
