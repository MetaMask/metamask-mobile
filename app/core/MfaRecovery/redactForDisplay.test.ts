import { redactForDisplay } from './redactForDisplay';

describe('redactForDisplay', () => {
  it('redacts email addresses and preserves surrounding quotes', () => {
    expect(redactForDisplay('email "user@example.com" rejected')).toBe(
      'email "<email>" rejected',
    );
  });

  it('leaves standalone or dangling @ tokens intact', () => {
    expect(redactForDisplay('prefix@ @suffix @')).toBe('prefix@ @suffix @');
  });

  it('redacts long token-like strings', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    expect(redactForDisplay(`token ${token} invalid`)).toBe(
      'token <redacted> invalid',
    );
  });

  it('truncates output to 120 characters', () => {
    const longText = 'word '.repeat(40);
    expect(redactForDisplay(longText)).toHaveLength(120);
  });
});
