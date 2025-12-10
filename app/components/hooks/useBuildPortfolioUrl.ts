import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useMetrics } from './useMetrics';
import { buildPortfolioUrl } from '../../util/browser';
import type { RootState } from '../../reducers';

/**
 * Hook to build Portfolio URLs with metrics parameters
 *
 * This hook automatically includes the user's marketing and metrics consent
 * preferences when building Portfolio URLs.
 *
 * @returns A function that builds a Portfolio URL with the appropriate parameters
 *
 * @example
 * const buildUrl = useBuildPortfolioUrl();
 * const portfolioUrl = buildUrl(AppConstants.PORTFOLIO.URL, {
 *   srcChain: chainId,
 *   token: tokenAddress,
 * });
 */
export const useBuildPortfolioUrl = () => {
  const { isEnabled } = useMetrics();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  return useCallback(
    (
      baseUrl: string,
      additionalParams?: Record<string, string | boolean | number>,
    ): URL => {
      const params: Record<string, string | boolean | number> = {
        marketingEnabled: isDataCollectionForMarketingEnabled ?? false,
        metricsEnabled: isEnabled(),
        ...additionalParams,
      };

      return buildPortfolioUrl(baseUrl, params);
    },
    [isDataCollectionForMarketingEnabled, isEnabled],
  );
};
