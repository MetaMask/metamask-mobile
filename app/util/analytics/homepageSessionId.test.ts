import { HOMEPAGE_APP_SESSION_ID } from './homepageSessionId';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('HOMEPAGE_APP_SESSION_ID', () => {
  it('is a valid UUID v4', () => {
    expect(HOMEPAGE_APP_SESSION_ID).toMatch(UUID_V4_REGEX);
  });
});
