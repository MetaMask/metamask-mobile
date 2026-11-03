import {
  generateUsername,
  generateUsernameWithNumber,
  MIDDLES,
  PREFIXES,
  SUFFIXES,
} from './generateUsername';

describe('generateUsername', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a prefix, middle, and suffix', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(generateUsername()).toBe('bonk_turbo_queen');
    expect(PREFIXES).toContain('bonk');
    expect(MIDDLES).toContain('turbo');
    expect(SUFFIXES).toContain('queen');
  });

  it('keeps generated handles inside the server length limit', () => {
    for (let i = 0; i < 50; i++) {
      const handle = generateUsername();
      const numbered = generateUsernameWithNumber();
      expect(handle).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
      expect(numbered).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
      expect(handle.length).toBeGreaterThanOrEqual(3);
      expect(numbered.length).toBeGreaterThanOrEqual(3);
      expect(handle.length).toBeLessThanOrEqual(16);
      expect(numbered.length).toBeLessThanOrEqual(16);
      expect(handle).not.toContain('-');
      expect(numbered).not.toContain('-');
    }
  });
});
