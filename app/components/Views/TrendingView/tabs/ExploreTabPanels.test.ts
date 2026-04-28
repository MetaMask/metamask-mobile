import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  useExploreTabPanelSections,
  useSectionStateTracker,
} from './ExploreTabPanels';
import type { ExploreTabId } from '../sections/types';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
// Selector modules pull in Perps/Predict trees — short-circuit them.
jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));
jest.mock('../../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

/** First useSelector call returns perps flag, second returns predict flag. */
const setFlags = ({ perps, predict }: { perps: boolean; predict: boolean }) => {
  mockUseSelector.mockReset();
  mockUseSelector
    .mockReturnValueOnce(perps)
    .mockReturnValueOnce(predict)
    // re-renders may invoke selectors again
    .mockReturnValue(perps);
};

const sectionIdsFor = (tab: ExploreTabId): string[] => {
  const { result } = renderHook(() => useExploreTabPanelSections(tab));
  return result.current.sections.map((s) => s.id);
};

describe('useExploreTabPanelSections', () => {
  describe('"now" tab', () => {
    it('includes predictions, crypto_movers, perps, stocks when both flags are on', () => {
      setFlags({ perps: true, predict: true });
      expect(sectionIdsFor('now')).toEqual([
        'predictions',
        'crypto_movers',
        'perps',
        'stocks',
      ]);
    });

    it('omits predictions when predict flag is off', () => {
      setFlags({ perps: true, predict: false });
      expect(sectionIdsFor('now')).toEqual([
        'crypto_movers',
        'perps',
        'stocks',
      ]);
    });

    it('omits perps when perps flag is off', () => {
      setFlags({ perps: false, predict: true });
      expect(sectionIdsFor('now')).toEqual([
        'predictions',
        'crypto_movers',
        'stocks',
      ]);
    });

    it('exposes the legacy TRENDING_FEED_SCROLL_VIEW testID for the feed scroll view', () => {
      setFlags({ perps: true, predict: true });
      const { result } = renderHook(() => useExploreTabPanelSections('now'));
      expect(result.current.scrollViewTestId).toBe('trending-feed-scroll-view');
    });
  });

  describe('other tabs', () => {
    it('macro tab returns politics_predictions + macro_stocks_commodity_perps when both flags are on', () => {
      setFlags({ perps: true, predict: true });
      expect(sectionIdsFor('macro')).toEqual([
        'politics_predictions',
        'macro_stocks_commodity_perps',
      ]);
    });

    it('rwas tab always starts with stocks and conditionally appends predict + perps', () => {
      setFlags({ perps: true, predict: true });
      expect(sectionIdsFor('rwas')).toEqual([
        'stocks',
        'politics_predictions',
        'rwa_perps',
      ]);
      setFlags({ perps: false, predict: false });
      expect(sectionIdsFor('rwas')).toEqual(['stocks']);
    });

    it('crypto tab always starts with tokens and ends with crypto_predictions', () => {
      setFlags({ perps: true, predict: true });
      expect(sectionIdsFor('crypto')).toEqual([
        'tokens',
        'crypto_perps',
        'crypto_predictions',
      ]);
    });

    it('sports tab is fixed and ignores feature flags', () => {
      setFlags({ perps: false, predict: false });
      expect(sectionIdsFor('sports')).toEqual([
        'sports_predictions',
        'all_sports',
      ]);
    });

    it('dapps tab returns all four dapp-related sections', () => {
      setFlags({ perps: false, predict: false });
      expect(sectionIdsFor('dapps')).toEqual([
        'dapps_recents',
        'dapps_favorites',
        'dapps_networks',
        'sites',
      ]);
    });

    it('non-"now" tabs do not set a scrollViewTestId', () => {
      setFlags({ perps: true, predict: true });
      const { result } = renderHook(() => useExploreTabPanelSections('crypto'));
      expect(result.current.scrollViewTestId).toBeUndefined();
    });
  });
});

describe('useSectionStateTracker', () => {
  const sections = [{ id: 'tokens' as const }, { id: 'perps' as const }];

  it('starts with an empty active-set', () => {
    const { result } = renderHook(() => useSectionStateTracker(sections));
    expect(result.current.sectionsWithState.size).toBe(0);
  });

  it('adds an id when its callback is invoked with true', () => {
    const { result } = renderHook(() => useSectionStateTracker(sections));
    act(() => {
      result.current.callbacks.tokens(true);
    });
    expect(Array.from(result.current.sectionsWithState)).toEqual(['tokens']);
  });

  it('removes an id when its callback is invoked with false', () => {
    const { result } = renderHook(() => useSectionStateTracker(sections));
    act(() => {
      result.current.callbacks.tokens(true);
      result.current.callbacks.perps(true);
    });
    act(() => {
      result.current.callbacks.tokens(false);
    });
    expect(Array.from(result.current.sectionsWithState)).toEqual(['perps']);
  });

  it('exposes a callback for every section id', () => {
    const { result } = renderHook(() => useSectionStateTracker(sections));
    expect(Object.keys(result.current.callbacks).sort()).toEqual([
      'perps',
      'tokens',
    ]);
  });
});
