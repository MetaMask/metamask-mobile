import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useBuildPortfolioUrl } from './useBuildPortfolioUrl';
import { useMetrics } from './useMetrics';
import { buildPortfolioUrl } from '../../util/browser';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useMetrics', () => ({
  useMetrics: jest.fn(),
}));

jest.mock('../../util/browser', () => ({
  buildPortfolioUrl: jest.fn(),
}));

describe('useBuildPortfolioUrl', () => {
  const mockIsEnabled = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
  const mockBuildPortfolioUrl = buildPortfolioUrl as jest.MockedFunction<
    typeof buildPortfolioUrl
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseMetrics.mockReturnValue({
      isEnabled: mockIsEnabled,
      trackEvent: jest.fn(),
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      getMetaMetricsId: jest.fn(),
      createEventBuilder: jest.fn(),
    });
  });

  it('should build portfolio URL with metrics enabled and marketing enabled', () => {
    // Arrange
    mockIsEnabled.mockReturnValue(true);
    mockUseSelector.mockReturnValue(true); // isDataCollectionForMarketingEnabled
    const mockUrl = new URL('https://portfolio.metamask.io');
    mockBuildPortfolioUrl.mockReturnValue(mockUrl);

    // Act
    const { result } = renderHook(() => useBuildPortfolioUrl());
    const buildUrl = result.current;
    const portfolioUrl = buildUrl('https://portfolio.metamask.io');

    // Assert
    expect(mockBuildPortfolioUrl).toHaveBeenCalledWith(
      'https://portfolio.metamask.io',
      {
        marketingEnabled: true,
        metricsEnabled: true,
      },
    );
    expect(portfolioUrl).toBe(mockUrl);
  });

  it('should build portfolio URL with metrics disabled and marketing disabled', () => {
    // Arrange
    mockIsEnabled.mockReturnValue(false);
    mockUseSelector.mockReturnValue(false); // isDataCollectionForMarketingEnabled
    const mockUrl = new URL('https://portfolio.metamask.io');
    mockBuildPortfolioUrl.mockReturnValue(mockUrl);

    // Act
    const { result } = renderHook(() => useBuildPortfolioUrl());
    const buildUrl = result.current;
    const portfolioUrl = buildUrl('https://portfolio.metamask.io');

    // Assert
    expect(mockBuildPortfolioUrl).toHaveBeenCalledWith(
      'https://portfolio.metamask.io',
      {
        marketingEnabled: false,
        metricsEnabled: false,
      },
    );
    expect(portfolioUrl).toBe(mockUrl);
  });

  it('should handle null marketing enabled state', () => {
    // Arrange
    mockIsEnabled.mockReturnValue(true);
    mockUseSelector.mockReturnValue(null); // isDataCollectionForMarketingEnabled is null
    const mockUrl = new URL('https://portfolio.metamask.io');
    mockBuildPortfolioUrl.mockReturnValue(mockUrl);

    // Act
    const { result } = renderHook(() => useBuildPortfolioUrl());
    const buildUrl = result.current;
    const portfolioUrl = buildUrl('https://portfolio.metamask.io');

    // Assert
    expect(mockBuildPortfolioUrl).toHaveBeenCalledWith(
      'https://portfolio.metamask.io',
      {
        marketingEnabled: false,
        metricsEnabled: true,
      },
    );
    expect(portfolioUrl).toBe(mockUrl);
  });

  it('should pass additional params to buildPortfolioUrl', () => {
    // Arrange
    mockIsEnabled.mockReturnValue(true);
    mockUseSelector.mockReturnValue(true);
    const mockUrl = new URL('https://portfolio.metamask.io');
    mockBuildPortfolioUrl.mockReturnValue(mockUrl);

    // Act
    const { result } = renderHook(() => useBuildPortfolioUrl());
    const buildUrl = result.current;
    const portfolioUrl = buildUrl('https://portfolio.metamask.io', {
      srcChain: 1,
      token: '0x123',
    });

    // Assert
    expect(mockBuildPortfolioUrl).toHaveBeenCalledWith(
      'https://portfolio.metamask.io',
      {
        marketingEnabled: true,
        metricsEnabled: true,
        srcChain: 1,
        token: '0x123',
      },
    );
    expect(portfolioUrl).toBe(mockUrl);
  });

  it('should memoize the returned function based on dependencies', () => {
    // Arrange
    mockIsEnabled.mockReturnValue(true);
    mockUseSelector.mockReturnValue(true);
    const mockUrl = new URL('https://portfolio.metamask.io');
    mockBuildPortfolioUrl.mockReturnValue(mockUrl);

    // Act
    const { result, rerender } = renderHook(() => useBuildPortfolioUrl());
    const firstBuildUrl = result.current;

    // Rerender without changing dependencies
    rerender();
    const secondBuildUrl = result.current;

    // Assert - function should be the same instance
    expect(firstBuildUrl).toBe(secondBuildUrl);
  });

  it('should create new function when dependencies change', () => {
    // Arrange
    mockIsEnabled.mockReturnValue(true);
    let marketingEnabled = true;
    mockUseSelector.mockImplementation(() => marketingEnabled);
    const mockUrl = new URL('https://portfolio.metamask.io');
    mockBuildPortfolioUrl.mockReturnValue(mockUrl);

    // Act
    const { result, rerender } = renderHook(() => useBuildPortfolioUrl());
    const firstBuildUrl = result.current;

    // Change dependency
    marketingEnabled = false;
    rerender();
    const secondBuildUrl = result.current;

    // Assert - function should be different instance
    expect(firstBuildUrl).not.toBe(secondBuildUrl);
  });
});
