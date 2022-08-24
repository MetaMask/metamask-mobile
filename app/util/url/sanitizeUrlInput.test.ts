import SanitizeUrlInput from './sanitizeUrlInput';

describe('SanitizeInputUrl', () => {
  it('should sanitize url passed to the browser', () => {
    const urlString = "https://random.xyz/#'+eval(atob('${btoa(payload)}'))+'";
    const sanitizedUrl = SanitizeUrlInput(urlString);
    expect(sanitizedUrl).toEqual(
      'https://random.xyz/#%27+eval(atob(%27${btoa(payload)}%27))+%27',
    );
  });
});
