import { getInstalledWidgets } from './getInstalledWidgets';

describe('getInstalledWidgets (non-iOS fallback)', () => {
  it('resolves with an empty array', async () => {
    await expect(getInstalledWidgets()).resolves.toEqual([]);
  });
});
