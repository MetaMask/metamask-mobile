import { bytesLengthToBitsLength } from './bytes';

describe('bytesLengthToBitsLength', () => {
  it('converts bytes length to bits length', () => {
    expect(bytesLengthToBitsLength(1)).toBe(8);
    expect(bytesLengthToBitsLength(2)).toBe(16);
    expect(bytesLengthToBitsLength(32)).toBe(256);
    expect(bytesLengthToBitsLength(0)).toBe(0);
  });
});
