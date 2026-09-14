/**
 * Unit tests for the pure nightly Slack payload builder. Network calls
 * (postToSlack) are exercised via SLACK_NIGHTLY_NOTIFICATION_DRY_RUN in the
 * workflow itself, not here.
 */

import { buildNightlyMessage } from './slack-nightly-notification.mjs';
import {
  RUNWAY_BUCKET_NIGHTLY_IOS_EXP,
  RUNWAY_BUCKET_NIGHTLY_IOS_RC,
  RUNWAY_BUCKET_NIGHTLY_ANDROID_EXP,
  RUNWAY_BUCKET_NIGHTLY_ANDROID_RC,
} from './runway-public-buckets.mjs';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/hBrjtFuA';

function blocksText(payload: { blocks: object[] }): string {
  return JSON.stringify(payload.blocks);
}

describe('buildNightlyMessage', () => {
  it('includes the version, all four build numbers, all four Runway bucket links, and TestFlight', () => {
    const payload = buildNightlyMessage({
      version: '8.6.0',
      iosExpBuildNumber: '101',
      iosRcBuildNumber: '102',
      androidExpBuildNumber: '201',
      androidRcBuildNumber: '202',
      pipelineUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/123',
    });

    const text = blocksText(payload);

    expect(text).toContain('8.6.0');
    expect(text).toContain('101');
    expect(text).toContain('102');
    expect(text).toContain('201');
    expect(text).toContain('202');
    expect(text).toContain(RUNWAY_BUCKET_NIGHTLY_IOS_EXP);
    expect(text).toContain(RUNWAY_BUCKET_NIGHTLY_IOS_RC);
    expect(text).toContain(RUNWAY_BUCKET_NIGHTLY_ANDROID_EXP);
    expect(text).toContain(RUNWAY_BUCKET_NIGHTLY_ANDROID_RC);
    expect(text).toContain(TESTFLIGHT_URL);
    expect(text).toContain('https://github.com/MetaMask/metamask-mobile/actions/runs/123');
    expect(payload.text).toContain('8.6.0');
  });

  it('falls back to N/A for missing build numbers', () => {
    const payload = buildNightlyMessage({ version: '8.6.0' });
    const text = blocksText(payload);

    expect(text).toContain('N/A');
    expect(text).toContain('8.6.0');
  });

  it('omits the pipeline link section when pipelineUrl is not provided', () => {
    const payload = buildNightlyMessage({ version: '8.6.0' });
    const text = blocksText(payload);

    expect(text).not.toContain('View Nightly Build Pipeline');
  });

  it('always notes that these are not release builds', () => {
    const payload = buildNightlyMessage({ version: '8.6.0' });
    const text = blocksText(payload);

    expect(text).toContain('not release builds');
  });
});
