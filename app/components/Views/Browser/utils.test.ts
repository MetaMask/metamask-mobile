import { getMountedTabIds } from './utils';
import type { BrowserTab } from './Browser.types';

describe('getMountedTabIds', () => {
  const makeTabs = (
    count: number,
    activeAt?: (i: number) => number,
  ): BrowserTab[] =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      url: `https://tab${i + 1}.com`,
      lastActiveAt: activeAt ? activeAt(i) : 1000 - i,
    }));

  it('returns all tabs when count is below maxMounted', () => {
    const tabs = makeTabs(3);
    const result = getMountedTabIds(tabs, 1, 5);
    expect(result.size).toBe(3);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
  });

  it('returns only maxMounted tabs when there are more', () => {
    const tabs = makeTabs(10);
    const result = getMountedTabIds(tabs, 1, 5);
    expect(result.size).toBe(5);
  });

  it('selects tabs with the highest lastActiveAt', () => {
    // Tab 1 lastActiveAt=1000, Tab 2=999, ..., Tab 10=991
    const tabs = makeTabs(10);
    const result = getMountedTabIds(tabs, 1, 5);
    // Top 5 by lastActiveAt should be tabs 1-5
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
    expect(result.has(4)).toBe(true);
    expect(result.has(5)).toBe(true);
    expect(result.has(6)).toBe(false);
  });

  it('always includes the active tab even if it has a low lastActiveAt', () => {
    // Tab 10 has the lowest lastActiveAt but is the active tab
    const tabs = makeTabs(10);
    const result = getMountedTabIds(tabs, 10, 5);
    expect(result.has(10)).toBe(true);
    expect(result.size).toBe(5);
  });

  it('handles tabs without lastActiveAt by treating them as 0', () => {
    const tabs: BrowserTab[] = [
      { id: 1, url: 'https://a.com', lastActiveAt: 100 },
      { id: 2, url: 'https://b.com' }, // no lastActiveAt
      { id: 3, url: 'https://c.com', lastActiveAt: 200 },
    ];
    const result = getMountedTabIds(tabs, 1, 2);
    // Tab 3 (200) and Tab 1 (100) should be mounted
    expect(result.has(3)).toBe(true);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(false);
  });

  it('handles null activeTabId', () => {
    const tabs = makeTabs(3);
    const result = getMountedTabIds(tabs, null, 5);
    expect(result.size).toBe(3);
  });

  it('handles empty tabs array', () => {
    const result = getMountedTabIds([], 1, 5);
    expect(result.size).toBe(0);
  });

  it('does not duplicate the active tab if it is already in the top set', () => {
    const tabs = makeTabs(10);
    // Tab 1 has the highest lastActiveAt (1000) and is active
    const result = getMountedTabIds(tabs, 1, 5);
    expect(result.size).toBe(5);
    expect(result.has(1)).toBe(true);
  });
});
