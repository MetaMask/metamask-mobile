import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { useLinkAccount } from './useLinkAccount';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Mock useRewardsToast
const mockShowToast = jest.fn();
const mockSuccessToast = jest.fn();
const mockErrorToast = jest.fn();

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: mockSuccessToast,
      error: mockErrorToast,
    },
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const mockStrings: Record<string, string> = {
      'rewards.settings.link_account_success_title': `${params?.accountName} linked successfully`,
      'rewards.settings.link_account_error_title': 'Failed to link account',
      'rewards.toast_dismiss': 'Dismiss',
    };
    return mockStrings[key] || key;
  }),
}));

describe('useLinkAccount', () => {
  // Set up mocks for the old toast system (for backward compatibility in tests)
  const mockCloseToast = jest.fn();
  const mockToastRef = {
    current: {
      showToast: jest.fn(),
      closeToast: mockCloseToast,
    },
  };

  // Get references to the mocked functions
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockUseContext = useContext as jest.MockedFunction<typeof useContext>;

  // Mock account data
  const mockAccount: InternalAccount = {
    id: 'test-account-id',
    address: '0x123456789abcdef',
    metadata: {
      name: 'Test Account',
      keyring: {
        type: 'HD Key Tree',
      },
      importTime: Date.now(),
    },
    type: 'eip155:eoa',
    options: {},
    scopes: [],
    methods: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockReturnValue(mockToastRef);
    mockEngineCall.mockResolvedValue(true);
  });

  it('should initialize with default values', () => {
    // Act
    const { result } = renderHook(() => useLinkAccount());

    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.linkAccount).toBe('function');
  });

  describe('linkAccount', () => {
    it('should link account successfully', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount,
      );

      // Verify success toast was shown
      expect(mockSuccessToast).toHaveBeenCalledWith(
        'Test Account linked successfully',
      );
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('should handle linking failure from controller', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Failed to link account');

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount,
      );

      // Verify error toast was shown
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to link account');
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  describe('exception handling', () => {
    it('should handle exceptions and show error toast', async () => {
      // Arrange
      const testError = new Error('Test error message');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccount());

      // Act
      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccount(mockAccount);
      });

      // Assert
      expect(linkResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Test error message');

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount,
      );

      expect(mockLoggerLog).toHaveBeenCalledWith(
        'useLinkAccount: Failed to link account',
        testError,
      );

      // Verify error toast was shown
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to link account');
      expect(mockShowToast).toHaveBeenCalled();
    });
  });
});
