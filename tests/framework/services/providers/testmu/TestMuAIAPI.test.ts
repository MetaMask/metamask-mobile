jest.mock('../../../logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import {
  extractTestIdFromRecordingUrl,
  parseShareLinkResponse,
} from './TestMuAIAPI';

describe('extractTestIdFromRecordingUrl', () => {
  it('reads the test id from a TestMu recording URL', () => {
    expect(
      extractTestIdFromRecordingUrl(
        'https://prod-mobile-artefacts.lambdatest.com/30d/orgId-3245013/2026/10/13/RMAA-AND-3245013-1791894232540457522DYM/video/video.mp4?verify=abc',
      ),
    ).toBe('RMAA-AND-3245013-1791894232540457522DYM');
  });

  it('returns null for other URLs', () => {
    expect(
      extractTestIdFromRecordingUrl('https://video.test/a.mp4'),
    ).toBeNull();
  });
});

describe('parseShareLinkResponse', () => {
  const SHARE = 'https://appautomation.lambdatest.com/share/US_04OKP9PCU4L620';

  it('finds a full share URL anywhere in the response', () => {
    expect(parseShareLinkResponse({ data: { link: SHARE } })).toBe(SHARE);
    expect(parseShareLinkResponse({ data: [{ url: SHARE }] })).toBe(SHARE);
  });

  it('builds the URL from a bare US_ token', () => {
    expect(
      parseShareLinkResponse({ data: { token: 'US_04OKP9PCU4L620' } }),
    ).toBe(SHARE);
  });

  it('returns null when there is no link', () => {
    expect(parseShareLinkResponse({ status: 'ok' })).toBeNull();
    expect(parseShareLinkResponse(undefined)).toBeNull();
  });
});
