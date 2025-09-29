import { renderHook, act } from '@testing-library/react-hooks';
import { useLinkAccount } from './useLinkAccount';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { formatAddress } from '../../../../util/address';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  formatAddress: jest.fn(),
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
    if (
      key === 'rewards.settings.link_account_success_title' &&
      params?.accountName
    ) {
      return `${params.accountName} linked successfully`;
    }
    if (key === 'rewards.settings.link_account_error_title') {
      return 'Failed to link account';
    }
    return key;
  }),
}));

describe('useLinkAccount', () => {
  // Get references to the mocked functions
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockFormatAddress = formatAddress as jest.MockedFunction<
    typeof formatAddress
  >;
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
    mockEngineCall.mockResolvedValue(true);
    mockFormatAddress.mockReturnValue('0x12345...bcdef');
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

      // Verify formatAddress was called and success toast was shown
      expect(mockFormatAddress).toHaveBeenCalledWith(
        mockAccount.address,
        'short',
      );
      expect(mockSuccessToast).toHaveBeenCalledWith(
        '0x12345...bcdef linked successfully',
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
