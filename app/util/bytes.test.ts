import { bytesToBits } from './bytes';

describe('bytesToBits', () => {
  it('should correctly convert bytes to bits', () => {
    expect(bytesToBits(1)).toBe(8);
    expect(bytesToBits(2)).toBe(16);
    expect(bytesToBits(32)).toBe(256);
    expect(bytesToBits(0)).toBe(0);
  });
});
