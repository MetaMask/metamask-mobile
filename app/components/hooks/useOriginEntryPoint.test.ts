import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import AppConstants from '../../core/AppConstants';
import { SourceType } from './useAnalytics/useAnalytics.types';
import type { OriginSource } from './useOriginSource';
import { useOriginEntryPoint } from './useOriginEntryPoint';

const IN_APP_BROWSER_SOURCE: OriginSource = {
  source: SourceType.IN_APP_BROWSER,
  requestSource: AppConstants.REQUEST_SOURCES.IN_APP_BROWSER,
};

const stateWithActiveTab = (tab: {
  url: string;
  entryPoint?: 'explore_search';
}) => ({
  browser: { tabs: [{ id: 1, ...tab }], activeTab: 1 },
});

describe('useOriginEntryPoint', () => {
  it('returns the entry point for an in-app browser request from the tagged tab', () => {
    const { result } = renderHookWithProvider(
      () => useOriginEntryPoint('app.uniswap.org', IN_APP_BROWSER_SOURCE),
      {
        state: stateWithActiveTab({
          url: 'https://app.uniswap.org',
          entryPoint: 'explore_search',
        }),
      },
    );

    expect(result.current).toBe('explore_search');
  });

  it('returns undefined for non-browser sources', () => {
    const { result } = renderHookWithProvider(
      () =>
        useOriginEntryPoint('app.uniswap.org', {
          source: SourceType.WALLET_CONNECT,
          requestSource: AppConstants.REQUEST_SOURCES.WC,
        }),
      {
        state: stateWithActiveTab({
          url: 'https://app.uniswap.org',
          entryPoint: 'explore_search',
        }),
      },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the active tab shows a different origin', () => {
    const { result } = renderHookWithProvider(
      () => useOriginEntryPoint('app.uniswap.org', IN_APP_BROWSER_SOURCE),
      {
        state: stateWithActiveTab({
          url: 'https://metamask.io',
          entryPoint: 'explore_search',
        }),
      },
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined without an origin', () => {
    const { result } = renderHookWithProvider(
      () => useOriginEntryPoint(undefined, IN_APP_BROWSER_SOURCE),
      {
        state: stateWithActiveTab({
          url: 'https://app.uniswap.org',
          entryPoint: 'explore_search',
        }),
      },
    );

    expect(result.current).toBeUndefined();
  });
});
