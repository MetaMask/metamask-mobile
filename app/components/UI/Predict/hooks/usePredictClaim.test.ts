import { NavigationProp } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Logger from '../../../../util/Logger';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { usePredictClaim } from './usePredictClaim';
import { usePredictTrading } from './usePredictTrading';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

// Create mock functions
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockClaimWinnings = jest.fn();
const mockShowToast = jest.fn();

// Mock dependencies
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('./usePredictEligibility');
jest.mock('./usePredictTrading');

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      error: {
        default: '#ca3542',
      },
      accent04: {
        normal: '#89b0ff',
      },
    },
  })),
}));

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const mockUsePredictTrading = usePredictTrading as jest.MockedFunction<
  typeof usePredictTrading
>;
const mockUseConfirmNavigation = useConfirmNavigation as jest.MockedFunction<
  typeof useConfirmNavigation
>;
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;

const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
} as unknown as NavigationProp<Record<string, object | undefined>>;

const mockCloseToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

describe('usePredictClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();

    // Default mock implementations
    jest.requireMock('@react-navigation/native').useNavigation = jest
      .fn()
      .mockReturnValue(mockNavigation);

    mockUsePredictTrading.mockReturnValue({
      claim: mockClaimWinnings,
      getPositions: jest.fn(),
      placeOrder: jest.fn(),
      calculateBetAmounts: jest.fn(),
      getBalance: jest.fn(),
      previewOrder: jest.fn(),
      deposit: jest.fn(),
      prepareWithdraw: jest.fn(),
    } as ReturnType<typeof usePredictTrading>);

    mockUseConfirmNavigation.mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    } as ReturnType<typeof useConfirmNavigation>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ToastContext.Provider,
      {
        value: {
          toastRef: mockToastRef as React.RefObject<{
            showToast: jest.Mock;
            closeToast: jest.Mock;
          }>,
        },
      },
      children,
    );

  describe('initialization', () => {
    it('returns claim function', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Assert
      expect(result.current.claim).toBeInstanceOf(Function);
    });
  });

  describe('claim function', () => {
    it('navigates to confirmation and claims winnings', async () => {
      // Arrange
      mockClaimWinnings.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        headerShown: false,
        loader: ConfirmationLoader.PredictClaim,
        stack: 'Predict',
      });
      expect(mockClaimWinnings).toHaveBeenCalledWith({
        providerId: POLYMARKET_PROVIDER_ID,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom providerId when claiming', async () => {
      // Arrange
      const customProviderId = 'custom-provider';
      mockClaimWinnings.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => usePredictClaim({ providerId: customProviderId }),
        { wrapper },
      );

      // Act
      await result.current.claim();

      // Assert
      expect(mockClaimWinnings).toHaveBeenCalledWith({
        providerId: customProviderId,
      });
    });
  });

  describe('error handling', () => {
    it('displays error toast when claim fails', async () => {
      // Arrange
      const mockError = new Error('Claim failed');
      mockClaimWinnings.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: {
            component: 'usePredictClaim',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              action: 'claim_winnings',
              method: 'claim',
              operation: 'position_management',
              providerId: POLYMARKET_PROVIDER_ID,
            },
          },
        }),
      );
      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('predict.claim.toasts.error.title'), isBold: true },
          { label: '\n', isBold: false },
          {
            label: strings('predict.claim.toasts.error.description'),
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: '#ca3542',
        backgroundColor: '#89b0ff',
        hasNoTimeout: false,
        linkButtonOptions: {
          label: strings('predict.claim.toasts.error.try_again'),
          onPress: expect.any(Function),
        },
      });
    });

    it('retries claim when try again button is pressed on error toast', async () => {
      // Arrange
      const mockError = new Error('Claim failed');
      mockClaimWinnings
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act - first claim attempt fails
      await result.current.claim();

      // Assert - first attempt should call goBack and captureException
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: {
            component: 'usePredictClaim',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              action: 'claim_winnings',
              method: 'claim',
              operation: 'position_management',
              providerId: POLYMARKET_PROVIDER_ID,
            },
          },
        }),
      );

      // Get the onPress function from the toast call
      const toastCall = mockShowToast.mock.calls[0][0];
      const retryFunction = toastCall.linkButtonOptions.onPress;

      // Clear mocks to track second attempt
      mockShowToast.mockClear();
      mockClaimWinnings.mockClear();
      mockNavigateToConfirmation.mockClear();
      mockGoBack.mockClear();
      mockLoggerError.mockClear();

      // Act - retry claim
      await retryFunction();

      // Assert - second attempt should succeed
      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        headerShown: false,
        loader: ConfirmationLoader.PredictClaim,
        stack: 'Predict',
      });
      expect(mockClaimWinnings).toHaveBeenCalledWith({
        providerId: POLYMARKET_PROVIDER_ID,
      });
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('captures exception to Sentry when claim fails', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockClaimWinnings.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: {
            component: 'usePredictClaim',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              action: 'claim_winnings',
              method: 'claim',
              operation: 'position_management',
              providerId: POLYMARKET_PROVIDER_ID,
            },
          },
        }),
      );
    });

    it('converts non-Error exceptions to Error when capturing to Sentry', async () => {
      // Arrange
      const mockErrorString = 'String error message';
      mockClaimWinnings.mockRejectedValue(mockErrorString);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('String error message'),
        {
          tags: {
            component: 'usePredictClaim',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              action: 'claim_winnings',
              method: 'claim',
              operation: 'position_management',
              providerId: POLYMARKET_PROVIDER_ID,
            },
          },
        },
      );
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('handles object errors by converting to Error for Sentry', async () => {
      // Arrange
      const mockErrorObject = { code: 'NETWORK_ERROR', message: 'Failed' };
      mockClaimWinnings.mockRejectedValue(mockErrorObject);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('[object Object]'),
        {
          tags: {
            component: 'usePredictClaim',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              action: 'claim_winnings',
              method: 'claim',
              operation: 'position_management',
              providerId: POLYMARKET_PROVIDER_ID,
            },
          },
        },
      );
    });
  });

  describe('toast context handling', () => {
    it('does not show toast when toastRef is null and claim fails', async () => {
      // Arrange
      const mockError = new Error('Claim failed');
      mockClaimWinnings.mockRejectedValue(mockError);

      const noToastWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ToastContext.Provider,
          {
            value: {
              toastRef: undefined,
            },
          },
          children,
        );

      const { result } = renderHook(() => usePredictClaim(), {
        wrapper: noToastWrapper,
      });

      // Act
      await result.current.claim();

      // Assert - captures exception and goes back even without toastRef
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: {
            component: 'usePredictClaim',
            feature: 'Predict',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              action: 'claim_winnings',
              method: 'claim',
              operation: 'position_management',
              providerId: POLYMARKET_PROVIDER_ID,
            },
          },
        }),
      );
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
