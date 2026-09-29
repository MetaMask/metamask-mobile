// Guards that redirect target groups stay disjoint so target types never collide.
import { SCREEN_NAMES, BOTTOM_SHEET_NAMES, MONEY_URLS } from './moneyEvents';

describe('moneyEvents redirect targets', () => {
  it('groups redirect targets into a disjoint partition', () => {
    const groups: Record<string, string[]> = {
      SCREEN_NAMES: Object.values(SCREEN_NAMES),
      BOTTOM_SHEET_NAMES: Object.values(BOTTOM_SHEET_NAMES),
      MONEY_URLS: Object.values(MONEY_URLS),
    };

    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const [group, values] of Object.entries(groups)) {
      for (const value of values) {
        const priorGroup = seen.get(value);
        if (priorGroup) {
          collisions.push(`"${value}" in both ${priorGroup} and ${group}`);
        } else {
          seen.set(value, group);
        }
      }
    }

    expect(collisions).toEqual([]);
  });
});
