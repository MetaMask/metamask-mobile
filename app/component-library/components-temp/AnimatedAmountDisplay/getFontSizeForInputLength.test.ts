import { getFontSizeForInputLength } from './getFontSizeForInputLength';

describe('getFontSizeForInputLength', () => {
  it('smoothly scales the font size using input and symbol length', () => {
    expect(getFontSizeForInputLength(1)).toEqual(88);
    expect(getFontSizeForInputLength(8)).toEqual(88);
    expect(getFontSizeForInputLength(9)).toEqual(85);
    expect(getFontSizeForInputLength(10)).toEqual(81);
    expect(getFontSizeForInputLength(18)).toEqual(53);
    expect(getFontSizeForInputLength(24)).toEqual(32);
    expect(getFontSizeForInputLength(25)).toEqual(31);
    expect(getFontSizeForInputLength(38)).toEqual(12);
    expect(getFontSizeForInputLength(40)).toEqual(12);
  });
});
