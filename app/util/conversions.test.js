import { multiplyHexes } from './conversions';

describe('multiplyHexes', () => {
  it('should correctly multiply two hex numbers', () => {
    const hex1 = '0x5';
    const hex2 = '0x5';
    const expectedResult = '19';

    const result = multiplyHexes(hex1, hex2);
    expect(result).toBe(expectedResult);
  });
});
