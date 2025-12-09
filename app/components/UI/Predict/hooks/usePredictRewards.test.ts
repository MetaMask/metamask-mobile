import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictRewards } from './usePredictRewards';
import utils, { type CaipAccountId } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import {
  POLYGON_MAINNET_CAIP_CHAIN_ID,
  POLYGON_USDC_CAIP_ASSET_ID,
} from '../providers/polymarket/constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../core/Multichain/utils', () => ({
  getFormattedAddressFromInternalAccount: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  toCaipAccountId: jest.fn(),
  parseCaipChainId: jest.fn(),
}));

jest.mock('../constants/errors', () => ({
  PREDICT_CONSTANTS: {
    FEATURE_NAME: 'Predict',
  },
}));

jest.mock('../providers/polymarket/constants', () => ({
  POLYGON_MAINNET_CAIP_CHAIN_ID: 'eip155:137',
  POLYGON_USDC_CAIP_ASSET_ID:
    'eip155:137/erc20:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  COLLATERAL_TOKEN_DECIMALS: 6,
}));

// Don't mock ensureError - use the real implementation
jest.mock('../utils/predictErrorHandler', () => {
  const actual = jest.requireActual('../utils/predictErrorHandler');
  return {
    ensureError: actual.ensureError,
  };
});

// Mock ethers parseUnits
jest.mock('ethers/lib/utils', () => ({
  parseUnits: jest.fn((value: string, decimals: number) => {
    const num = parseFloat(value);
    const multiplier = Math.pow(10, decimals);
    return {
      toString: () => (num * multiplier).toString(),
    };
  }),
}));

describe('usePredictRewards', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockControllerMessengerCall = Engine.controllerMessenger
    .call as jest.MockedFunction<typeof Engine.controllerMessenger.call>;
  const mockControllerMessengerSubscribe = Engine.controllerMessenger
    .subscribe as jest.MockedFunction<
    typeof Engine.controllerMessenger.subscribe
  >;

  const mockLoggerError = Logger.error as jest.MockedFunction<
    typeof Logger.error
  >;
  const mockParseCaipChainId = utils.parseCaipChainId as jest.MockedFunction<
    typeof utils.parseCaipChainId
  >;
  const mockToCaipAccountId = utils.toCaipAccountId as jest.MockedFunction<
    typeof utils.toCaipAccountId
  >;
  const mockGetFormattedAddressFromInternalAccount =
    getFormattedAddressFromInternalAccount as jest.MockedFunction<
      typeof getFormattedAddressFromInternalAccount
    >;

  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockCaipAccount =
    'eip155:137:0x1234567890123456789012345678901234567890' as CaipAccountId;
  const mockInternalAccount = {
    id: 'account-1',
    address: mockAddress,
    name: 'Test Account',
    type: 'eip155:eoa',
    scopes: [POLYGON_MAINNET_CAIP_CHAIN_ID],
    metadata: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock selector to return a function that returns the account
    mockUseSelector.mockReturnValue((scope: string) => {
      if (scope === POLYGON_MAINNET_CAIP_CHAIN_ID) {
        return mockInternalAccount;
      }
      return undefined;
    });

    mockGetFormattedAddressFromInternalAccount.mockReturnValue(mockAddress);
    mockParseCaipChainId.mockReturnValue({
      namespace: 'eip155',
      reference: '137',
    });
    mockToCaipAccountId.mockReturnValue(mockCaipAccount);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when rewards are enabled and account has opted in', () => {
    it('returns enabled true, estimated points, and subscribes to accountLinked event', async () => {
      // Arrange
      const mockEstimatedPoints = 100;
      mockControllerMessengerCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce('subscription-1') // getCandidateSubscriptionId
        .mockResolvedValueOnce(true) // getHasAccountOptedIn
        .mockResolvedValueOnce({
          pointsEstimate: mockEstimatedPoints,
        }); // estimatePoints

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert - initial state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.enabled).toBe(false);
      expect(result.current.accountOptedIn).toBe(null);
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.hasError).toBe(false);

      // Assert - final state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.estimatedPoints).toBe(mockEstimatedPoints);
      });

      expect(result.current.enabled).toBe(true);
      expect(result.current.accountOptedIn).toBe(true);
      expect(result.current.shouldShowRewardsRow).toBe(true);
      expect(result.current.hasError).toBe(false);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);

      // Verify controller calls
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
        mockCaipAccount,
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.objectContaining({
          activityType: 'PREDICT',
          account: mockCaipAccount,
          activityContext: {
            predictContext: {
              feeAsset: {
                id: POLYGON_USDC_CAIP_ASSET_ID,
                amount: expect.any(String),
              },
            },
          },
        }),
      );

      // Verify subscription
      expect(mockControllerMessengerSubscribe).toHaveBeenCalledWith(
        'RewardsController:accountLinked',
        expect.any(Function),
      );
    });
  });

  describe('when there is no active season', () => {
    it('returns enabled false and stops checking', async () => {
      // Arrange
      mockControllerMessengerCall.mockResolvedValueOnce(false);

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(result.current.accountOptedIn).toBe(null);
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
    });
  });

  describe('when no subscription exists', () => {
    it('returns enabled false when getCandidateSubscriptionId returns null', async () => {
      // Arrange
      mockControllerMessengerCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce(null); // getCandidateSubscriptionId

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(result.current.accountOptedIn).toBe(null);
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.hasError).toBe(false);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(2);
    });
  });

  describe('when account has not opted in', () => {
    it('returns enabled based on opt-in support and does not estimate points', async () => {
      // Arrange
      mockControllerMessengerCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce('subscription-1') // getCandidateSubscriptionId
        .mockResolvedValueOnce(false) // getHasAccountOptedIn
        .mockResolvedValueOnce(true); // isOptInSupported

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(true);
      expect(result.current.accountOptedIn).toBe(false);
      expect(result.current.shouldShowRewardsRow).toBe(true);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.hasError).toBe(false);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);

      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockInternalAccount,
      );
      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.anything(),
      );
    });

    it('returns enabled false when opt-in is not supported', async () => {
      // Arrange
      mockControllerMessengerCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce('subscription-1') // getCandidateSubscriptionId
        .mockResolvedValueOnce(false) // getHasAccountOptedIn
        .mockResolvedValueOnce(false); // isOptInSupported

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(result.current.accountOptedIn).toBe(false);
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);
    });
  });

  describe('when selected account is missing', () => {
    it('returns enabled false and isLoading false without calling controller', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(() => undefined);

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(result.current.accountOptedIn).toBe(null);
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.rewardsAccountScope).toBe(null);
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });
  });

  describe('when CAIP-10 formatting fails', () => {
    it('returns enabled false and logs error with proper context', async () => {
      // Arrange
      const mockError = new Error('Invalid chain ID');
      mockParseCaipChainId.mockImplementation(() => {
        throw mockError;
      });
      mockControllerMessengerCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockControllerMessengerCall.mockResolvedValueOnce('subscription-1'); // getCandidateSubscriptionId

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(result.current.accountOptedIn).toBe(null);
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid chain ID' }),
        {
          tags: {
            feature: 'Predict',
            component: 'usePredictRewards',
          },
          context: {
            name: 'usePredictRewards',
            data: {
              method: 'formatAccountToCaipAccountId',
              action: 'caip_formatting',
              operation: 'account_formatting',
            },
          },
        },
      );
    });
  });

  describe('when RewardsController call fails', () => {
    it('returns hasError true and logs error with proper context', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockControllerMessengerCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce('subscription-1') // getCandidateSubscriptionId
        .mockResolvedValueOnce(true) // getHasAccountOptedIn
        .mockRejectedValueOnce(mockError); // estimatePoints

      // Suppress console.error for this test since we expect an error to be thrown
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress error output
        });

      // Act
      const { result } = renderHook(() => usePredictRewards(10.5));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.enabled).toBe(true);
      expect(result.current.accountOptedIn).toBe(true);
      expect(result.current.shouldShowRewardsRow).toBe(true);
      expect(result.current.estimatedPoints).toBe(null);
      expect(result.current.rewardsAccountScope).toEqual(mockInternalAccount);
      expect(mockLoggerError).toHaveBeenCalledWith(expect.any(Error), {
        tags: {
          feature: 'Predict',
          component: 'usePredictRewards',
        },
        context: {
          name: 'usePredictRewards',
          data: {
            method: 'estimatePoints',
            action: 'rewards_estimation',
            operation: 'points_estimation',
          },
        },
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
