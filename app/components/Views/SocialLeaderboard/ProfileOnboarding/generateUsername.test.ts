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

    expect(generateUsername()).toBe('bonk-turbo-queen');
    expect(PREFIXES).toContain('bonk');
    expect(MIDDLES).toContain('turbo');
    expect(SUFFIXES).toContain('queen');
  });

  it('keeps generated handles inside the onboarding length limit', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateUsername().length).toBeLessThanOrEqual(20);
      expect(generateUsernameWithNumber().length).toBeLessThanOrEqual(20);
    }
  });
});
