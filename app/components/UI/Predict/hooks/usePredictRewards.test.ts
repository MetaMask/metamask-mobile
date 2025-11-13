import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictRewards } from './usePredictRewards';
import bridgeController from '@metamask/bridge-controller';
import utils, { type CaipAccountId, CaipChainId } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
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

// Don't mock ensureError - use the real implementation
jest.mock('../utils/predictErrorHandler', () => {
  const actual = jest.requireActual('../utils/predictErrorHandler');
  return {
    ensureError: actual.ensureError,
  };
});

describe('usePredictRewards', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockControllerMessengerCall = Engine.controllerMessenger
    .call as jest.MockedFunction<typeof Engine.controllerMessenger.call>;
  const mockLoggerError = Logger.error as jest.MockedFunction<
    typeof Logger.error
  >;
  const mockFormatChainIdToCaip =
    bridgeController.formatChainIdToCaip as jest.MockedFunction<
      typeof bridgeController.formatChainIdToCaip
    >;
  const mockParseCaipChainId = utils.parseCaipChainId as jest.MockedFunction<
    typeof utils.parseCaipChainId
  >;
  const mockToCaipAccountId = utils.toCaipAccountId as jest.MockedFunction<
    typeof utils.toCaipAccountId
  >;

  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockCaipAccount =
    'eip155:137:0x1234567890123456789012345678901234567890' as CaipAccountId;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue(mockAddress);
    mockFormatChainIdToCaip.mockReturnValue('eip155:137' as CaipChainId);
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
    it('returns enabled true and isLoading transitions from true to false', async () => {
      // Arrange
      mockControllerMessengerCall
        .mockReturnValueOnce(true)
        .mockResolvedValueOnce(true);

      // Act
      const { result } = renderHook(() => usePredictRewards());

      // Assert - initial state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.enabled).toBe(false);

      // Assert - final state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(true);
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(2);
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:isRewardsFeatureEnabled',
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
        mockCaipAccount,
      );
    });
  });

  describe('when rewards feature is not enabled', () => {
    it('returns enabled false and stops checking', async () => {
      // Arrange
      mockControllerMessengerCall.mockReturnValueOnce(false);

      // Act
      const { result } = renderHook(() => usePredictRewards());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:isRewardsFeatureEnabled',
      );
    });
  });

  describe('when account has not opted in', () => {
    it('returns enabled false after checking opt-in status', async () => {
      // Arrange
      mockControllerMessengerCall
        .mockReturnValueOnce(true)
        .mockResolvedValueOnce(false);

      // Act
      const { result } = renderHook(() => usePredictRewards());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(2);
    });
  });

  describe('when selected address is missing', () => {
    it('returns enabled false and isLoading false without calling controller', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(null);

      // Act
      const { result } = renderHook(() => usePredictRewards());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });
  });

  describe('when CAIP-10 formatting fails', () => {
    it('returns enabled false and logs error with proper context', async () => {
      // Arrange
      const mockError = new Error('Invalid chain ID');
      mockFormatChainIdToCaip.mockImplementation(() => {
        throw mockError;
      });
      mockControllerMessengerCall.mockReturnValueOnce(true);

      // Act
      const { result } = renderHook(() => usePredictRewards());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(mockLoggerError).toHaveBeenCalledWith(mockError, {
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
      });
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('when RewardsController call fails', () => {
    it('returns enabled false and logs error with proper context', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockControllerMessengerCall.mockReturnValueOnce(true);
      mockControllerMessengerCall.mockRejectedValueOnce(mockError);

      // Suppress console.error for this test since we expect an error to be thrown
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress error output
        });

      // Act
      const { result } = renderHook(() => usePredictRewards());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
      expect(mockLoggerError).toHaveBeenCalledWith(mockError, {
        tags: {
          feature: 'Predict',
          component: 'usePredictRewards',
        },
        context: {
          name: 'usePredictRewards',
          data: {
            method: 'checkRewardsEnabled',
            action: 'rewards_check',
            operation: 'rewards_status',
          },
        },
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('when account changes', () => {
    it('rechecks rewards status with new account', async () => {
      // Arrange
      mockControllerMessengerCall
        .mockReturnValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockReturnValueOnce(true)
        .mockResolvedValueOnce(false);

      // Act
      const { result, rerender } = renderHook(() => usePredictRewards());

      // Assert - first account
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(true);
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(2);

      // Arrange - change account
      const newAddress = '0x9876543210987654321098765432109876543210';
      const newCaipAccount =
        'eip155:137:0x9876543210987654321098765432109876543210' as CaipAccountId;
      mockUseSelector.mockReturnValue(newAddress);
      mockToCaipAccountId.mockReturnValue(newCaipAccount);

      // Act - trigger rerender
      rerender({});

      // Assert - second account
      await waitFor(() => {
        expect(result.current.enabled).toBe(false);
      });

      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(4);
      expect(mockControllerMessengerCall).toHaveBeenLastCalledWith(
        'RewardsController:getHasAccountOptedIn',
        newCaipAccount,
      );
    });
  });
});
