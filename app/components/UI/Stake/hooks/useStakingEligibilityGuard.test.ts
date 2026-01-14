import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useStakingEligibilityGuard } from './useStakingEligibilityGuard';
import useStakingEligibility from './useStakingEligibility';
import { useBuildPortfolioUrl } from '../../../hooks/useBuildPortfolioUrl';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { BrowserTab } from '../../Tokens/types';
import { mockEarnControllerRootState } from '../testUtils';

// Mock dependencies
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./useStakingEligibility');
jest.mock('../../../hooks/useBuildPortfolioUrl');

describe('useStakingEligibilityGuard', () => {
  const mockUseStakingEligibility =
    useStakingEligibility as jest.MockedFunction<typeof useStakingEligibility>;
  const mockUseBuildPortfolioUrl = useBuildPortfolioUrl as jest.MockedFunction<
    typeof useBuildPortfolioUrl
  >;

  const mockBuildPortfolioUrl = jest.fn();
  const mockStakeUrl = new URL('https://portfolio.metamask.io/stake');

  const MOCK_EARN_STATE = mockEarnControllerRootState();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseBuildPortfolioUrl.mockReturnValue(mockBuildPortfolioUrl);
    mockBuildPortfolioUrl.mockReturnValue(mockStakeUrl);
  });

  describe('when user is eligible', () => {
    it('returns true and does not navigate when user is eligible', () => {
      // Arrange
      mockUseStakingEligibility.mockReturnValue({
        isEligible: true,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const canProceed = result.current.checkEligibilityAndRedirect();

      // Assert
      expect(canProceed).toBe(true);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('returns isEligible as true when user is eligible', () => {
      // Arrange
      mockUseStakingEligibility.mockReturnValue({
        isEligible: true,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );

      // Assert
      expect(result.current.isEligible).toBe(true);
    });
  });

  describe('when user is not eligible', () => {
    beforeEach(() => {
      mockUseStakingEligibility.mockReturnValue({
        isEligible: false,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });
    });

    it('returns false and navigates to Portfolio with newTabUrl when no existing tab', () => {
      // Arrange
      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const canProceed = result.current.checkEligibilityAndRedirect();

      // Assert
      expect(canProceed).toBe(false);
      expect(mockBuildPortfolioUrl).toHaveBeenCalledWith(
        AppConstants.STAKE.URL,
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: mockStakeUrl.href,
          timestamp: expect.any(Number),
        },
      });
    });

    it('returns false and navigates to Portfolio with existingTabId when existing tab found', () => {
      // Arrange
      const existingTab: BrowserTab = {
        id: 'tab-123',
        url: 'https://portfolio.metamask.io/stake',
      };

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [existingTab],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const canProceed = result.current.checkEligibilityAndRedirect();

      // Assert
      expect(canProceed).toBe(false);
      expect(mockBuildPortfolioUrl).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          existingTabId: 'tab-123',
          newTabUrl: undefined,
          timestamp: expect.any(Number),
        },
      });
    });

    it('finds existing tab by checking if URL includes STAKE.URL', () => {
      // Arrange
      const stakeTab: BrowserTab = {
        id: 'stake-tab',
        url: 'https://portfolio.metamask.io/stake?some=params',
      };
      const otherTab: BrowserTab = {
        id: 'other-tab',
        url: 'https://portfolio.metamask.io/bridge',
      };

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [otherTab, stakeTab],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      result.current.checkEligibilityAndRedirect();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          existingTabId: 'stake-tab',
          newTabUrl: undefined,
          timestamp: expect.any(Number),
        },
      });
    });

    it('returns isEligible as false when user is not eligible', () => {
      // Arrange
      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );

      // Assert
      expect(result.current.isEligible).toBe(false);
    });

    it('includes timestamp in navigation params', () => {
      // Arrange
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      result.current.checkEligibilityAndRedirect();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: mockStakeUrl.href,
          timestamp: mockTimestamp,
        },
      });

      jest.restoreAllMocks();
    });
  });

  describe('hook memoization', () => {
    it('returns the same checkEligibilityAndRedirect function on rerender when dependencies do not change', () => {
      // Arrange
      mockUseStakingEligibility.mockReturnValue({
        isEligible: true,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result, rerender } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const firstFunction = result.current.checkEligibilityAndRedirect;

      rerender(undefined);
      const secondFunction = result.current.checkEligibilityAndRedirect;

      // Assert
      expect(firstFunction).toBe(secondFunction);
    });

    it('returns a new checkEligibilityAndRedirect function when isEligible changes', () => {
      // Arrange
      let isEligible = true;
      mockUseStakingEligibility.mockImplementation(() => ({
        isEligible,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      }));

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result, rerender } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const firstFunction = result.current.checkEligibilityAndRedirect;

      isEligible = false;
      rerender(undefined);
      const secondFunction = result.current.checkEligibilityAndRedirect;

      // Assert
      expect(firstFunction).not.toBe(secondFunction);
    });
  });

  describe('edge cases', () => {
    it('handles empty browser tabs array', () => {
      // Arrange
      mockUseStakingEligibility.mockReturnValue({
        isEligible: false,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs: [],
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const canProceed = result.current.checkEligibilityAndRedirect();

      // Assert
      expect(canProceed).toBe(false);
      expect(mockBuildPortfolioUrl).toHaveBeenCalled();
    });

    it('handles multiple tabs but none matching stake URL', () => {
      // Arrange
      mockUseStakingEligibility.mockReturnValue({
        isEligible: false,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });
      const tabs: BrowserTab[] = [
        {
          id: 'tab-1',
          url: 'https://portfolio.metamask.io/bridge',
        },
        {
          id: 'tab-2',
          url: 'https://portfolio.metamask.io/explore',
        },
      ];

      const mockState = {
        ...MOCK_EARN_STATE,
        browser: {
          tabs,
        },
      };

      // Act
      const { result } = renderHookWithProvider(
        () => useStakingEligibilityGuard(),
        { state: mockState },
      );
      const canProceed = result.current.checkEligibilityAndRedirect();

      // Assert
      expect(canProceed).toBe(false);
      expect(mockBuildPortfolioUrl).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: mockStakeUrl.href,
          timestamp: expect.any(Number),
        },
      });
    });
  });
});
