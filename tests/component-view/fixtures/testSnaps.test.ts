import { TEST_SNAPS_URL } from '../../selectors/Browser/TestSnaps.selectors';
import { TEST_SNAPS_FIXTURES_VERSION } from './testSnaps';

describe('test-snaps component view fixtures', () => {
  it('match the test-snaps release used by the Appium smoke suite', () => {
    const urlVersion = TEST_SNAPS_URL.match(/\/test-snaps\/([^/]+)\/?$/u)?.[1];

    // If this fails, TEST_SNAPS_URL was bumped. Re-check the Snap UI fixtures
    // in ./testSnaps.ts against the new test-snaps release, update them if the
    // example Snaps changed, then set TEST_SNAPS_FIXTURES_VERSION to match.
    expect(urlVersion).toBe(TEST_SNAPS_FIXTURES_VERSION);
  });
});
