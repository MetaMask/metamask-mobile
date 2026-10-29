import { parseAmountWithAssistiveDecimals } from './custom-amount.utils';

describe('parseAmountWithAssistiveDecimals', () => {
  describe('active entry mode (isEditing = true)', () => {
    it('Stage 1: displays whole initial zero without assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('0', true)).toEqual({
        typedText: '0',
        assistiveText: '',
      });
    });

    it('Stage 2: typing decimal on zero displays . and "00" assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('0.', true)).toEqual({
        typedText: '0.',
        assistiveText: '00',
      });
    });

    it('Stage 3: typing decimal on 1 displays 1. and "00" assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('1.', true)).toEqual({
        typedText: '1.',
        assistiveText: '00',
      });
    });

    it('Stage 4: typing first decimal replaces one zero and keeps "0" assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('1.2', true)).toEqual({
        typedText: '1.2',
        assistiveText: '0',
      });
    });

    it('Stage 5: typing second decimal completes decimal input without assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('1.25', true)).toEqual({
        typedText: '1.25',
        assistiveText: '',
      });
    });

    it('Stage 6 & 7: typing decimal on large whole amount formats integer and displays "00"', () => {
      expect(parseAmountWithAssistiveDecimals('10000.', true)).toEqual({
        typedText: '10,000.',
        assistiveText: '00',
      });
    });

    it('Stage 8: backspacing decimal point leaves whole amount with no assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('10000', true)).toEqual({
        typedText: '10,000',
        assistiveText: '',
      });
    });

    it('Stage 9: typing 0 after decimal on large amount displays "0" assistive text', () => {
      expect(parseAmountWithAssistiveDecimals('10000.0', true)).toEqual({
        typedText: '10,000.0',
        assistiveText: '0',
      });
    });

    it('Stage 9: typing non-zero second decimal completes decimal entry', () => {
      expect(parseAmountWithAssistiveDecimals('10000.09', true)).toEqual({
        typedText: '10,000.09',
        assistiveText: '',
      });
    });

    it('normalizes a comma decimal separator and truncates beyond 2 decimals', () => {
      expect(parseAmountWithAssistiveDecimals('500,987654', true)).toEqual({
        typedText: '500.98',
        assistiveText: '',
      });
    });

    it('preserves malformed multi-dot input unchanged', () => {
      expect(parseAmountWithAssistiveDecimals('1.2.3456', true)).toEqual({
        typedText: '1.2.3456',
        assistiveText: '',
      });
    });
  });

  describe('inactive / summary mode (isEditing = false)', () => {
    it('auto drops trailing ".00" for whole dollar values', () => {
      expect(parseAmountWithAssistiveDecimals('1.00', false)).toEqual({
        typedText: '1',
        assistiveText: '',
      });
      expect(parseAmountWithAssistiveDecimals('10000.00', false)).toEqual({
        typedText: '10,000',
        assistiveText: '',
      });
    });

    it('auto drops trailing decimal dot', () => {
      expect(parseAmountWithAssistiveDecimals('12.', false)).toEqual({
        typedText: '12',
        assistiveText: '',
      });
    });

    it('preserves meaningful cents', () => {
      expect(parseAmountWithAssistiveDecimals('1.25', false)).toEqual({
        typedText: '1.25',
        assistiveText: '',
      });
      expect(parseAmountWithAssistiveDecimals('10000.09', false)).toEqual({
        typedText: '10,000.09',
        assistiveText: '',
      });
    });
  });
});
