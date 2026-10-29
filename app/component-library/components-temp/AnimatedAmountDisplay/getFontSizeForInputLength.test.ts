import { getFontSizeForInputLength } from './getFontSizeForInputLength';

describe('getFontSizeForInputLength', () => {
  it('smoothly scales the font size using input and symbol length', () => {
    expect(getFontSizeForInputLength(1)).toEqual(60);
    expect(getFontSizeForInputLength(10)).toEqual(60);
    expect(getFontSizeForInputLength(11)).toEqual(57);
    expect(getFontSizeForInputLength(12)).toEqual(53);
    expect(getFontSizeForInputLength(18)).toEqual(32);
    expect(getFontSizeForInputLength(19)).toEqual(31);
    expect(getFontSizeForInputLength(24)).toEqual(23);
    expect(getFontSizeForInputLength(32)).toEqual(12);
    expect(getFontSizeForInputLength(40)).toEqual(12);
  });
});
