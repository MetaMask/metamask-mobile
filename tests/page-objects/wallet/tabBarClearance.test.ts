import { pixelsToClearTabBar } from './tabBarClearance';

describe('pixelsToClearTabBar', () => {
  const tabBarTop = 2000;

  it('returns 0 when the target is well above the tab bar', () => {
    expect(pixelsToClearTabBar({ y: 1200, height: 100 }, tabBarTop)).toBe(0);
  });

  it('asks for a small scroll when the target only touches the bar edge', () => {
    const needed = pixelsToClearTabBar({ y: 1900, height: 80 }, tabBarTop);

    expect(needed).toBeGreaterThan(0);
    expect(needed).toBeLessThan(100);
  });

  it('asks for at least the target height when it is fully behind the bar', () => {
    const target = { y: 2050, height: 90 };

    expect(pixelsToClearTabBar(target, tabBarTop)).toBeGreaterThan(
      target.height,
    );
  });

  it('scrolls further the deeper the target sits under the bar', () => {
    const shallow = pixelsToClearTabBar({ y: 2000, height: 80 }, tabBarTop);
    const deep = pixelsToClearTabBar({ y: 2100, height: 80 }, tabBarTop);

    expect(deep - shallow).toBe(100);
  });
});
