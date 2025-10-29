import { renderHook } from '@testing-library/react-hooks';
import { NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import React from 'react';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Routes from '../../../../constants/navigation/Routes';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { usePredictClaim } from './usePredictClaim';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictTrading } from './usePredictTrading';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';

// Create mock functions
const mockNavigate = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockClaimWinnings = jest.fn();
const mockShowToast = jest.fn();

// Mock dependencies
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  connect: jest.fn(() => (component: unknown) => component),
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

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUsePredictEligibility = usePredictEligibility as jest.MockedFunction<
  typeof usePredictEligibility
>;
const mockUsePredictTrading = usePredictTrading as jest.MockedFunction<
  typeof usePredictTrading
>;
const mockUseConfirmNavigation = useConfirmNavigation as jest.MockedFunction<
  typeof useConfirmNavigation
>;

const mockNavigation = {
  navigate: mockNavigate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as unknown as NavigationProp<any>;

const mockToastRef = {
  current: {
    showToast: mockShowToast,
  },
};

describe('usePredictClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    jest.requireMock('@react-navigation/native').useNavigation = jest
      .fn()
      .mockReturnValue(mockNavigation);

    mockUsePredictEligibility.mockReturnValue({
      isEligible: true,
      refreshEligibility: jest.fn(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUsePredictTrading.mockReturnValue({
      claim: mockClaimWinnings,
      getPositions: jest.fn(),
      placeOrder: jest.fn(),
      calculateBetAmounts: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseConfirmNavigation.mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSelector.mockReturnValue({
      status: 'pending',
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ToastContext.Provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { value: { toastRef: mockToastRef as any } },
      children,
    );

  describe('initialization', () => {
    it('returns claim function and status', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Assert
      expect(result.current.claim).toBeInstanceOf(Function);
      expect(result.current.status).toBe('pending');
    });

    it('uses default providerId when not specified', () => {
      // Arrange & Act
      renderHook(() => usePredictClaim(), { wrapper });

      // Assert
      expect(mockUsePredictEligibility).toHaveBeenCalledWith({
        providerId: POLYMARKET_PROVIDER_ID,
      });
    });

    it('uses custom providerId when specified', () => {
      // Arrange
      const customProviderId = 'custom-provider';

      // Act
      renderHook(() => usePredictClaim({ providerId: customProviderId }), {
        wrapper,
      });

      // Assert
      expect(mockUsePredictEligibility).toHaveBeenCalledWith({
        providerId: customProviderId,
      });
    });
  });

  describe('claim function', () => {
    it('navigates to unavailable modal when user is not eligible', async () => {
      // Arrange
      mockUsePredictEligibility.mockReturnValue({
        isEligible: false,
        refreshEligibility: jest.fn(),
      });

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(mockClaimWinnings).not.toHaveBeenCalled();
    });

    it('navigates to confirmation and claims winnings when user is eligible', async () => {
      // Arrange
      mockUsePredictEligibility.mockReturnValue({
        isEligible: true,
        refreshEligibility: jest.fn(),
      });
      mockClaimWinnings.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        headerShown: false,
        stack: Routes.PREDICT.ROOT,
      });
      expect(mockClaimWinnings).toHaveBeenCalledWith({
        providerId: POLYMARKET_PROVIDER_ID,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom providerId when claiming', async () => {
      // Arrange
      const customProviderId = 'custom-provider';
      mockUsePredictEligibility.mockReturnValue({
        isEligible: true,
        refreshEligibility: jest.fn(),
      });
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
      mockUsePredictEligibility.mockReturnValue({
        isEligible: true,
        refreshEligibility: jest.fn(),
      });
      mockClaimWinnings.mockRejectedValue(mockError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with claim:',
        mockError,
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

      consoleErrorSpy.mockRestore();
    });

    it('retries claim when try again button is pressed on error toast', async () => {
      // Arrange
      const mockError = new Error('Claim failed');
      mockUsePredictEligibility.mockReturnValue({
        isEligible: true,
        refreshEligibility: jest.fn(),
      });
      mockClaimWinnings
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(undefined);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act - first claim attempt fails
      await result.current.claim();

      // Get the onPress function from the toast call
      const toastCall = mockShowToast.mock.calls[0][0];
      const retryFunction = toastCall.linkButtonOptions.onPress;

      // Clear mocks to track second attempt
      mockShowToast.mockClear();
      mockClaimWinnings.mockClear();
      mockNavigateToConfirmation.mockClear();

      // Act - retry claim
      await retryFunction();

      // Assert - second attempt should succeed
      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        headerShown: false,
        stack: Routes.PREDICT.ROOT,
      });
      expect(mockClaimWinnings).toHaveBeenCalledWith({
        providerId: POLYMARKET_PROVIDER_ID,
      });
      expect(mockShowToast).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('logs error to console when claim fails', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockUsePredictEligibility.mockReturnValue({
        isEligible: true,
        refreshEligibility: jest.fn(),
      });
      mockClaimWinnings.mockRejectedValue(mockError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Act
      await result.current.claim();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with claim:',
        mockError,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('status', () => {
    it('returns status from claimTransaction selector', () => {
      // Arrange
      mockUseSelector.mockReturnValue({
        status: 'completed',
      });

      // Act
      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Assert
      expect(result.current.status).toBe('completed');
    });

    it('returns undefined when claimTransaction is not available', () => {
      // Arrange
      mockUseSelector.mockReturnValue(undefined);

      // Act
      const { result } = renderHook(() => usePredictClaim(), { wrapper });

      // Assert
      expect(result.current.status).toBeUndefined();
    });
  });

  describe('toast context handling', () => {
    it('handles missing toastRef gracefully on error', async () => {
      // Arrange
      const mockError = new Error('Claim failed');
      mockUsePredictEligibility.mockReturnValue({
        isEligible: true,
        refreshEligibility: jest.fn(),
      });
      mockClaimWinnings.mockRejectedValue(mockError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const noToastWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ToastContext.Provider,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { value: { toastRef: null as any } },
          children,
        );

      const { result } = renderHook(() => usePredictClaim(), {
        wrapper: noToastWrapper,
      });

      // Act
      await result.current.claim();

      // Assert - should not throw error even without toastRef
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with claim:',
        mockError,
      );
      expect(mockShowToast).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
