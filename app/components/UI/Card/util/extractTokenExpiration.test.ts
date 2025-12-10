import { extractTokenExpiration } from './extractTokenExpiration';

describe('extractTokenExpiration', () => {
  it('returns default expiration for UUID token', () => {
    const uuidToken = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const expiration = extractTokenExpiration(uuidToken);
    expect(expiration).toBe(18000); // 5 hours in seconds
  });

  it('returns default expiration for any string token', () => {
    const randomToken = 'some-random-token-string';
    const expiration = extractTokenExpiration(randomToken);
    expect(expiration).toBe(18000);
  });

  it('returns default expiration for empty string', () => {
    const emptyToken = '';
    const expiration = extractTokenExpiration(emptyToken);
    expect(expiration).toBe(18000);
  });

  it('returns consistent value across multiple calls', () => {
    const token = 'test-token';
    const expiration1 = extractTokenExpiration(token);
    const expiration2 = extractTokenExpiration(token);
    expect(expiration1).toBe(expiration2);
  });

  it('returns 18000 seconds (5 hours)', () => {
    const token = 'any-token';
    const expiration = extractTokenExpiration(token);

    // Verify it's 5 hours (with 1 hour buffer from actual 6 hour expiration)
    const hours = expiration / 3600;
    expect(hours).toBe(5);
    expect(expiration).toBe(18000);
  });
});
