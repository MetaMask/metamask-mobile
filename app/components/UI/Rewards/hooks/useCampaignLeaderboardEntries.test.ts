import { renderHook } from '@testing-library/react-hooks';
import { useCampaignLeaderboardEntries } from './useCampaignLeaderboardEntries';

interface TestEntry {
  rank: number;
}

const entries: TestEntry[] = Array.from({ length: 30 }, (_, index) => ({
  rank: index + 1,
}));

describe('useCampaignLeaderboardEntries', () => {
  it('limits preview entries to maxEntries when split view is not needed', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        maxEntries: 3,
        userPosition: { rank: 2, neighbors: [] },
      }),
    );

    expect(result.current.isPreview).toBe(true);
    expect(result.current.showSplitView).toBe(false);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 3));
  });

  it('shows three top rows in preview split view', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        maxEntries: 3,
        userPosition: { rank: 12, neighbors: [{ rank: 11 }, { rank: 12 }] },
      }),
    );

    expect(result.current.showSplitView).toBe(true);
    expect(result.current.splitViewTopCount).toBe(3);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 3));
  });

  it('shows eighteen top rows in full split view for ranks 21 and 22', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        userPosition: { rank: 21, neighbors: [{ rank: 20 }, { rank: 21 }] },
      }),
    );

    expect(result.current.isPreview).toBe(false);
    expect(result.current.showSplitView).toBe(true);
    expect(result.current.splitViewTopCount).toBe(18);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 18));
  });

  it('shows twenty top rows in full split view for lower ranks', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        userPosition: { rank: 25, neighbors: [{ rank: 24 }, { rank: 25 }] },
      }),
    );

    expect(result.current.showSplitView).toBe(true);
    expect(result.current.splitViewTopCount).toBe(20);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 20));
  });

  it('shows the configured board when it is wider than the default', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        boardSize: 30,
        userPosition: { rank: 25, neighbors: [{ rank: 24 }, { rank: 25 }] },
      }),
    );

    expect(result.current.showSplitView).toBe(false);
    expect(result.current.visibleEntries).toEqual(entries);
  });

  it('shortens the top strip for the two ranks just past a wider board', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        boardSize: 30,
        userPosition: { rank: 31, neighbors: [{ rank: 30 }, { rank: 31 }] },
      }),
    );

    expect(result.current.showSplitView).toBe(true);
    expect(result.current.splitViewTopCount).toBe(28);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 28));
  });

  it('keeps a preview limit when the full board is wider', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        maxEntries: 5,
        boardSize: 30,
      }),
    );

    expect(result.current.isPreview).toBe(true);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 5));
  });

  it('can disable split view with a campaign-specific guard', () => {
    const { result } = renderHook(() =>
      useCampaignLeaderboardEntries({
        entries,
        maxEntries: 3,
        userPosition: { rank: 12, neighbors: [{ rank: 11 }, { rank: 12 }] },
        canShowSplitView: false,
      }),
    );

    expect(result.current.showSplitView).toBe(false);
    expect(result.current.visibleEntries).toEqual(entries.slice(0, 3));
  });
});
