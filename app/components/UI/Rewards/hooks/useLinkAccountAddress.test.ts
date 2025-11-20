import { renderHook, act } from '@testing-library/react-hooks';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useLinkAccountAddress } from './useLinkAccountAddress';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { deriveAccountMetricProps } from '../utils';
import useRewardsToast from './useRewardsToast';
import { strings } from '../../../../../locales/i18n';
import { formatAddress } from '../../../../util/address';
import { IMetaMetricsEvent } from '../../../../core/Analytics';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    REWARDS_ACCOUNT_LINKING_STARTED: 'Rewards Account Linking Started',
    REWARDS_ACCOUNT_LINKING_COMPLETED: 'Rewards Account Linking Completed',
    REWARDS_ACCOUNT_LINKING_FAILED: 'Rewards Account Linking Failed',
  },
  useMetrics: jest.fn(),
}));

jest.mock('../utils', () => ({
  deriveAccountMetricProps: jest.fn(),
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (key === 'rewards.link_account_group.link_account_address_error') {
      return `Failed to link ${params?.address || 'account'}`;
    }
    return key;
  }),
}));

jest.mock('../../../../util/address', () => ({
  formatAddress: jest.fn(
    (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
  ),
}));

describe('useLinkAccountAddress', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseMetrics = jest.mocked(useMetrics);
  const mockDeriveAccountMetricProps = jest.mocked(deriveAccountMetricProps);
  const mockUseRewardsToast = jest.mocked(useRewardsToast);
  const mockStrings = jest.mocked(strings);
  const mockFormatAddress = jest.mocked(formatAddress);

  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn().mockReturnValue({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      event: expect.any(String),
      properties: expect.any(Object),
    } as unknown as IMetaMetricsEvent),
  });

  const mockShowToast = jest.fn();
  const mockRewardsToastOptions = {
    error: jest.fn().mockReturnValue({
      variant: 'icon',
      iconName: 'error',
      hapticsType: 'error',
    }),
  };

  const mockAccount: InternalAccount = {
    id: 'test-account-id',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
    options: {},
    methods: [],
    metadata: {
      name: 'Test Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup useMetrics mock
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);

    // Setup useRewardsToast mock
    mockUseRewardsToast.mockReturnValue({
      showToast: mockShowToast,
      RewardsToastOptions: {
        ...mockRewardsToastOptions,
        success: jest.fn().mockReturnValue({
          variant: 'icon',
          iconName: 'confirmation',
          hapticsType: 'success',
        }),
      },
    });

    // Setup deriveAccountMetricProps mock
    mockDeriveAccountMetricProps.mockReturnValue({
      scope: 'evm',
      account_type: 'HD Key Tree',
    });

    // Setup formatAddress mock
    mockFormatAddress.mockImplementation(
      (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
    );
  });

  describe('Hook initialization', () => {
    it('returns hook interface with initial state', () => {
      const { result } = renderHook(() => useLinkAccountAddress());

      expect(result.current).toEqual({
        linkAccountAddress: expect.any(Function),
        isLoading: false,
        isError: false,
      });
    });

    it('initializes with showToasts defaulting to true', () => {
      const { result } = renderHook(() => useLinkAccountAddress());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.linkAccountAddress).toBe('function');
    });

    it('initializes with showToasts set to false when provided', () => {
      const { result } = renderHook(() => useLinkAccountAddress(false));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('Successful account linking', () => {
    it('links account when opt-in is supported and not already opted in', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockResolvedValueOnce({ ois: [false] }) // getOptInStatus
        .mockResolvedValueOnce(true); // linkAccountToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(true);
      expect(mockEngineCall).toHaveBeenCalledTimes(3);
      expect(mockEngineCall).toHaveBeenNthCalledWith(
        1,
        'RewardsController:isOptInSupported',
        mockAccount,
      );
      expect(mockEngineCall).toHaveBeenNthCalledWith(
        2,
        'RewardsController:getOptInStatus',
        { addresses: [mockAccount.address] },
      );
      expect(mockEngineCall).toHaveBeenNthCalledWith(
        3,
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount,
      );
    });

    it('tracks started event when linking begins', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockResolvedValueOnce({ ois: [false] }) // getOptInStatus
        .mockResolvedValueOnce(true); // linkAccountToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockDeriveAccountMetricProps).toHaveBeenCalledWith(mockAccount);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_STARTED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks completed event when linking succeeds', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockResolvedValueOnce({ ois: [false] }) // getOptInStatus
        .mockResolvedValueOnce(true); // linkAccountToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_COMPLETED,
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started + Completed
    });

    it('clears loading state in finally block', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Account already opted in', () => {
    it('returns true immediately when account is already opted in', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockResolvedValueOnce({ ois: [true] }); // getOptInStatus - already opted in

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(true);
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        expect.anything(),
      );
    });

    it('does not track events when account is already opted in', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [true] });

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not show toast when account is already opted in', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [true] });

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Account not supported', () => {
    it('returns false when account does not support opt-in', async () => {
      mockEngineCall.mockResolvedValueOnce(false); // isOptInSupported

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockAccount,
      );
    });

    it('sets error state when account does not support opt-in', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(result.current.isError).toBe(true);
    });

    it('shows error toast when account does not support opt-in and showToasts is true', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress(true));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockFormatAddress).toHaveBeenCalledWith(
        mockAccount.address,
        'short',
      );
      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_address_error',
        {
          address: expect.any(String),
        },
      );
      expect(mockRewardsToastOptions.error).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('does not show toast when account does not support opt-in and showToasts is false', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress(false));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Linking failure', () => {
    it('returns false when linkAccountToSubscriptionCandidate returns false', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockResolvedValueOnce({ ois: [false] }) // getOptInStatus
        .mockResolvedValueOnce(false); // linkAccountToSubscriptionCandidate - fails

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    it('tracks failed event when linkAccountToSubscriptionCandidate returns false', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started + Failed
    });

    it('shows error toast when linkAccountToSubscriptionCandidate returns false and showToasts is true', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress(true));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).toHaveBeenCalled();
      expect(mockRewardsToastOptions.error).toHaveBeenCalled();
    });

    it('does not show toast when linkAccountToSubscriptionCandidate returns false and showToasts is false', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress(false));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('handles error during isOptInSupported check', async () => {
      const testError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('shows error toast when isOptInSupported throws and showToasts is true', async () => {
      const testError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccountAddress(true));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).toHaveBeenCalled();
      expect(mockRewardsToastOptions.error).toHaveBeenCalled();
    });

    it('handles error during getOptInStatus check', async () => {
      const testError = new Error('Status check failed');
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockRejectedValueOnce(testError); // getOptInStatus

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    it('handles error during linkAccountToSubscriptionCandidate', async () => {
      const testError = new Error('Linking failed');
      mockEngineCall
        .mockResolvedValueOnce(true) // isOptInSupported
        .mockResolvedValueOnce({ ois: [false] }) // getOptInStatus
        .mockRejectedValueOnce(testError); // linkAccountToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountAddress());

      let linkResult: boolean | undefined;
      await act(async () => {
        linkResult = await result.current.linkAccountAddress(mockAccount);
      });

      expect(linkResult).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    it('tracks failed event when linkAccountToSubscriptionCandidate throws', async () => {
      const testError = new Error('Linking failed');
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started + Failed
    });

    it('shows error toast when linkAccountToSubscriptionCandidate throws and showToasts is true', async () => {
      const testError = new Error('Linking failed');
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccountAddress(true));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).toHaveBeenCalled();
      expect(mockRewardsToastOptions.error).toHaveBeenCalled();
    });

    it('does not show toast when error occurs and showToasts is false', async () => {
      const testError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccountAddress(false));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('clears loading state even when error occurs', async () => {
      const testError = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('State management', () => {
    it('resets error state when starting new link attempt', async () => {
      // First attempt fails
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(result.current.isError).toBe(true);

      // Second attempt succeeds
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(true);

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(result.current.isError).toBe(false);
    });

    it('maintains separate state for multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useLinkAccountAddress());
      const { result: result2 } = renderHook(() => useLinkAccountAddress());

      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
      expect(result1.current.isError).toBe(false);
      expect(result2.current.isError).toBe(false);
    });
  });

  describe('Event tracking integration', () => {
    it('calls deriveAccountMetricProps with correct account', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockDeriveAccountMetricProps).toHaveBeenCalledWith(mockAccount);
    });

    it('builds event with account metric properties', async () => {
      const mockAccountProps = {
        scope: 'evm',
        account_type: 'HD Key Tree',
      };
      mockDeriveAccountMetricProps.mockReturnValue(mockAccountProps);

      mockEngineCall
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce({ ois: [false] })
        .mockResolvedValueOnce(true);

      const { result } = renderHook(() => useLinkAccountAddress());

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      const mockAddProperties = mockCreateEventBuilder().addProperties;
      expect(mockAddProperties).toHaveBeenCalledWith(mockAccountProps);
    });
  });

  describe('Toast integration', () => {
    it('formats address correctly for toast message', async () => {
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress(true));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockFormatAddress).toHaveBeenCalledWith(
        mockAccount.address,
        'short',
      );
    });

    it('uses formatted address in error message', async () => {
      const formattedAddress = '0x1234...7890';
      mockFormatAddress.mockReturnValue(formattedAddress);
      mockEngineCall.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLinkAccountAddress(true));

      await act(async () => {
        await result.current.linkAccountAddress(mockAccount);
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_address_error',
        {
          address: formattedAddress,
        },
      );
    });
  });
});
