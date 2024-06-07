import SanitizeUrlInput from './sanitizeUrlInput';

describe('sanitizeUrlInput', () => {
  it('should sanitize url passed to the browser', () => {
    const urlString = "https://random.xyz/#'+eval(atob('${btoa(payload)}'))+'";
    const sanitizedUrl = SanitizeUrlInput(urlString);
    expect(sanitizedUrl).toEqual(
      'https://random.xyz/#%27+eval(atob(%27${btoa(payload)}%27))+%27',
    );
  });

  it('should return empty string if input starts with "javascript:"', () => {
    // eslint-disable-next-line no-script-url
    const input = 'javascript:alert("XSS")';
    const output = SanitizeUrlInput(input);
    expect(output).toBe('');
  });

  it('should replace single quote with %27', () => {
    const input = "http://example.com/test'script";
    const output = SanitizeUrlInput(input);
    expect(output).toBe('http://example.com/test%27script');
  });

  it('should remove carriage return and newline characters', () => {
    const input = 'http://example.com/test\r\nscript';
    const output = SanitizeUrlInput(input);
    expect(output).toBe('http://example.com/testscript');
  });

  it('should return the same URL if no special characters are present', () => {
    const input = 'http://example.com/testscript';
    const output = SanitizeUrlInput(input);
    expect(output).toBe(input);
  });
});
