const { checkValue } = require('./validate-value');

const codes = (issues) => issues.map((i) => i.code);

describe('checkValue', () => {
  describe('happy path', () => {
    it('returns no issues for a typical single-line secret', () => {
      expect(checkValue('X', 'key_live_abc123xyz')).toEqual([]);
    });

    it('returns no issues for a multi-line base64 blob (embedded \\n mid-value is allowed)', () => {
      const b64 = 'eyJhcGlLZXkiOiJhYmMifQ==\nsecond-line-content==';
      expect(checkValue('GOOGLE_SERVICES_B64_IOS', b64)).toEqual([]);
    });

    it('coerces non-string values via String()', () => {
      expect(checkValue('N', 42)).toEqual([]);
      expect(checkValue('B', true)).toEqual([]);
    });
  });

  describe('missing / empty', () => {
    it('flags undefined', () => {
      expect(codes(checkValue('X', undefined))).toEqual(['missing']);
    });

    it('flags null', () => {
      expect(codes(checkValue('X', null))).toEqual(['missing']);
    });

    it('flags empty string by default', () => {
      expect(codes(checkValue('X', ''))).toEqual(['empty']);
    });

    it('allows empty string when allowEmpty=true', () => {
      expect(checkValue('X', '', { allowEmpty: true })).toEqual([]);
    });

    it('flags whitespace-only even when allowEmpty=true', () => {
      expect(codes(checkValue('X', '   ', { allowEmpty: true }))).toEqual([
        'whitespace_only',
      ]);
    });
  });

  describe('leading / trailing whitespace', () => {
    it('flags trailing newline (the classic paste mistake)', () => {
      expect(codes(checkValue('X', 'value\n'))).toEqual([
        'trailing_whitespace',
      ]);
    });

    it('flags trailing space', () => {
      expect(codes(checkValue('X', 'value '))).toEqual([
        'trailing_whitespace',
      ]);
    });

    it('flags trailing tab', () => {
      expect(codes(checkValue('X', 'value\t'))).toEqual([
        'trailing_whitespace',
      ]);
    });

    it('flags leading space', () => {
      expect(codes(checkValue('X', ' value'))).toEqual([
        'leading_whitespace',
      ]);
    });

    it('flags both leading and trailing whitespace in one pass', () => {
      expect(codes(checkValue('X', ' value '))).toEqual([
        'leading_whitespace',
        'trailing_whitespace',
      ]);
    });
  });

  describe('control characters', () => {
    it('flags any \\r (Windows line endings)', () => {
      expect(codes(checkValue('X', 'abc\r\ndef'))).toContain('carriage_return');
    });

    it('flags a standalone \\r mid-value', () => {
      expect(codes(checkValue('X', 'abc\rdef'))).toContain('carriage_return');
    });

    it('flags NUL bytes', () => {
      expect(codes(checkValue('X', 'abc\u0000def'))).toContain('nul_byte');
    });

    it('flags other C0 control characters', () => {
      expect(codes(checkValue('X', 'abc\u0007def'))).toContain(
        'control_chars',
      );
    });

    it('flags DEL (U+007F)', () => {
      expect(codes(checkValue('X', 'abc\u007Fdef'))).toContain(
        'control_chars',
      );
    });

    it('does NOT flag tab mid-value', () => {
      expect(checkValue('X', 'abc\tdef')).toEqual([]);
    });

    it('does NOT flag LF mid-value (allowed for PEM / base64)', () => {
      expect(checkValue('X', 'abc\ndef')).toEqual([]);
    });
  });

  describe('invisible characters', () => {
    it('flags zero-width space', () => {
      expect(codes(checkValue('X', 'abc\u200Bdef'))).toContain('zero_width');
    });

    it('flags BOM', () => {
      expect(codes(checkValue('X', '\uFEFFvalue'))).toEqual(
        expect.arrayContaining(['leading_whitespace', 'zero_width']),
      );
    });

    it('flags zero-width joiner', () => {
      expect(codes(checkValue('X', 'abc\u200Ddef'))).toContain('zero_width');
    });
  });

  describe('message safety', () => {
    it('never includes the value in the message', () => {
      const secret = 'super-secret-token-xyz';
      const issues = checkValue('X', `${secret}\n`);
      for (const { message } of issues) {
        expect(message).not.toContain(secret);
      }
    });

    it('includes the name, a byte length, and the code in the output', () => {
      const [issue] = checkValue('MM_SENTRY_DSN', 'abc ');
      expect(issue.code).toBe('trailing_whitespace');
      expect(issue.message).toContain('MM_SENTRY_DSN');
      expect(issue.message).toMatch(/\d+ bytes/);
    });
  });
});
