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

    expect(generateUsername()).toBe('BonkTurboQueen');
    expect(PREFIXES).toContain('Bonk');
    expect(MIDDLES).toContain('Turbo');
    expect(SUFFIXES).toContain('Queen');
  });

  it('keeps generated handles inside the server length limit', () => {
    for (let i = 0; i < 50; i++) {
      const handle = generateUsername();
      const numbered = generateUsernameWithNumber();
      expect(handle).toMatch(/^[a-zA-Z0-9]+$/);
      expect(numbered).toMatch(/^[a-zA-Z0-9]+$/);
      expect(handle.length).toBeGreaterThanOrEqual(3);
      expect(numbered.length).toBeGreaterThanOrEqual(3);
      expect(handle.length).toBeLessThanOrEqual(16);
      expect(numbered.length).toBeLessThanOrEqual(16);
    }
  });

  it('appends a three-digit number to the numbered handle', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateUsernameWithNumber()).toMatch(/^[A-Za-z]+\d{3}$/);
    }
  });

  it('returns the fallback handles when every roll is too long', () => {
    // Every pick lands on index 13, giving "DiamondWildOracle" (17 characters),
    // which is too long for a 16-character handle and for a 13-character base.
    jest.spyOn(Math, 'random').mockReturnValue(0.27);

    expect(generateUsername()).toBe('GmZenWolf');
    expect(generateUsernameWithNumber()).toBe('WenMoon343');
  });
});
